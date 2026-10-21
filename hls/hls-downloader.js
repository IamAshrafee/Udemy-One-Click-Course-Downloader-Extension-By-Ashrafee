// Downloads an HLS (m3u8) stream into a single playable file.
//
//  - Picks a quality from the master playlist.
//  - Downloads the video and (if separate) audio renditions segment by segment.
//  - fMP4/CMAF streams are merged into one .mp4, MPEG-TS streams are joined into one .ts.
//  - Encrypted / DRM-protected streams are refused (never decrypted).
//
// All I/O is injected so the same code runs in the extension's offscreen document
// and in Node tests:
//   fetchBytes(url, byteRange | null) -> Promise<Uint8Array>
//   createSink(ext) -> Promise<{ write(u8): Promise<void>, close(): Promise<any>, abort(): Promise<void> }>
(function (root) {
    'use strict';

    const Parser = typeof require !== 'undefined' ? require('./hls-parser.js') : root.HlsParser;
    const Mux = typeof require !== 'undefined' ? require('./fmp4-mux.js') : root.Fmp4Mux;

    class HlsError extends Error {
        constructor(code, message) {
            super(message);
            this.code = code;
        }
    }

    const KNOWN_FMP4_FIRST_BOX = ['styp', 'moof', 'sidx', 'ftyp', 'free', 'emsg', 'prft', 'skip'];

    function sleep(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    async function withRetry(fn, { retries = 3, isCancelled = () => false } = {}) {
        let lastError;
        for (let attempt = 0; attempt < retries; attempt++) {
            if (isCancelled()) throw new HlsError('CANCELLED', 'Cancelled');
            try {
                return await fn();
            } catch (e) {
                lastError = e;
                if (e && e.fatal) throw e;
                if (attempt < retries - 1) await sleep(800 * Math.pow(2, attempt));
            }
        }
        throw lastError;
    }

    function textOf(bytes) {
        return new TextDecoder('utf-8').decode(bytes);
    }

    function describeEncryption(method) {
        return new HlsError('ENCRYPTED',
            'This video uses ' + method + ' encryption (DRM). It cannot be downloaded by this extension.');
    }

    // Run `fetchItem` for every item with a bounded look-ahead window, but hand the
    // results to `writeItem` strictly in order.
    async function runOrdered(items, fetchItem, writeItem, { concurrency = 4, isCancelled }) {
        const pending = new Array(items.length);
        let next = 0;
        const start = i => {
            const p = fetchItem(items[i], i);
            p.catch(() => {}); // avoid unhandled-rejection noise; awaited below
            pending[i] = p;
        };
        for (; next < Math.min(concurrency, items.length); next++) start(next);

        for (let i = 0; i < items.length; i++) {
            if (isCancelled()) throw new HlsError('CANCELLED', 'Cancelled');
            const data = await pending[i];
            pending[i] = null;
            if (next < items.length) start(next++);
            await writeItem(data, items[i], i);
        }
    }

    async function downloadHls(options) {
        const {
            url,
            quality = 'highest',
            fetchBytes,
            createSink,
            onProgress = () => {},
            isCancelled = () => false,
            concurrency = 4
        } = options;

        const get = (u, range) => withRetry(() => fetchBytes(u, range || null), { isCancelled });
        const getText = async u => textOf(await get(u));

        // 1. Playlists -----------------------------------------------------------
        onProgress({ stage: 'playlist' });
        const rootText = await getText(url);
        if (!/^#EXTM3U/.test(rootText.trim())) {
            throw new HlsError('NOT_HLS', 'The URL did not return an HLS playlist.');
        }

        let videoPlaylistUrl = url;
        let audioPlaylistUrl = null;
        let chosen = null;

        if (Parser.isMasterPlaylist(rootText)) {
            const master = Parser.parseMaster(rootText, url);
            if (master.encrypted) throw describeEncryption(master.encrypted);
            chosen = Parser.pickVariant(master.variants, quality);
            if (!chosen) throw new HlsError('NO_VARIANT', 'The playlist lists no playable video variant.');
            videoPlaylistUrl = chosen.url;
            const audio = Parser.pickAudio(master, chosen);
            if (audio) audioPlaylistUrl = audio.uri;
        }

        const video = Parser.parseMedia(await getText(videoPlaylistUrl), videoPlaylistUrl);
        if (video.encrypted) throw describeEncryption(video.encrypted);
        if (!video.segments.length) throw new HlsError('EMPTY', 'The video playlist has no segments.');

        let audio = null;
        if (audioPlaylistUrl) {
            audio = Parser.parseMedia(await getText(audioPlaylistUrl), audioPlaylistUrl);
            if (audio.encrypted) throw describeEncryption(audio.encrypted);
            if (!audio.segments.length) audio = null;
        }

        // 2. Decide the container --------------------------------------------------
        const isFmp4 = !!video.init;
        if (!isFmp4 && audio) {
            throw new HlsError('UNSUPPORTED', 'MPEG-TS stream with a separate audio track is not supported.');
        }
        if (isFmp4 && audio && !audio.init) {
            throw new HlsError('UNSUPPORTED', 'Audio rendition has no init segment.');
        }
        const ext = isFmp4 ? 'mp4' : 'ts';

        // 3. Build the work list --------------------------------------------------
        let headerBytes = null;
        let work; // [{ url, byteRange, kind: 'v'|'a' }]
        let audioMap = null;

        if (isFmp4) {
            const videoInit = await get(video.init.url, video.init.byteRange);
            if (Mux.isEncryptedInit(videoInit)) throw describeEncryption('CENC');

            if (audio) {
                const audioInit = await get(audio.init.url, audio.init.byteRange);
                if (Mux.isEncryptedInit(audioInit)) throw describeEncryption('CENC');
                const merged = Mux.mergeInits(videoInit, audioInit);
                headerBytes = merged.init;
                audioMap = { from: merged.firstAudioIdFrom, to: merged.firstAudioIdTo };
                const order = Mux.interleave(video.segments, audio.segments);
                work = order.map(o => {
                    const seg = o.track === 'v' ? video.segments[o.index] : audio.segments[o.index];
                    return { url: seg.url, byteRange: seg.byteRange, kind: o.track };
                });
            } else {
                headerBytes = videoInit;
                work = video.segments.map(s => ({ url: s.url, byteRange: s.byteRange, kind: 'v' }));
            }
        } else {
            work = video.segments.map(s => ({ url: s.url, byteRange: s.byteRange, kind: 'v' }));
        }

        // 4. Download + write ------------------------------------------------------
        const sink = await createSink(ext);
        let bytesWritten = 0;
        try {
            if (headerBytes) {
                await sink.write(headerBytes);
                bytesWritten += headerBytes.length;
            }

            await runOrdered(
                work,
                item => get(item.url, item.byteRange),
                async (data, item, i) => {
                    let out = data;
                    if (isFmp4) {
                        if (audio) {
                            out = Mux.prepareFragment(
                                data,
                                item.kind === 'a' ? audioMap.from : 0,
                                item.kind === 'a' ? audioMap.to : 0
                            );
                        } else if (i === 0) {
                            const type = String.fromCharCode(data[4], data[5], data[6], data[7]);
                            if (!KNOWN_FMP4_FIRST_BOX.includes(type)) {
                                throw new HlsError('BAD_SEGMENT', 'First segment is not a valid MP4 fragment.');
                            }
                        }
                    } else if (i === 0 && data[0] !== 0x47) {
                        throw new HlsError('BAD_SEGMENT', 'First segment is not a valid MPEG-TS packet stream.');
                    }
                    await sink.write(out);
                    bytesWritten += out.length;
                    onProgress({ stage: 'segments', done: i + 1, total: work.length, bytes: bytesWritten });
                },
                { concurrency, isCancelled }
            );
        } catch (e) {
            try { await sink.abort(); } catch (_) { /* ignore */ }
            throw e;
        }

        const result = await sink.close();
        return {
            ext,
            bytes: bytesWritten,
            height: chosen ? chosen.height : 0,
            segments: work.length,
            sinkResult: result
        };
    }

    const api = { downloadHls, HlsError };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.HlsDownloader = api;
})(typeof self !== 'undefined' ? self : this);
