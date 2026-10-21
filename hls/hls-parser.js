// HLS playlist parsing helpers (master + media playlists).
// Pure functions, no DOM / chrome APIs, so they can be unit-tested in Node.
(function (root) {
    'use strict';

    function parseAttributes(str) {
        const out = {};
        const re = /([A-Z0-9-]+)=("[^"]*"|[^,]*)/g;
        let m;
        while ((m = re.exec(str))) {
            out[m[1]] = m[2].replace(/^"|"$/g, '');
        }
        return out;
    }

    // Resolve a playlist-relative URI. If the playlist URL carried a query string
    // (signed URLs) and the child URI has none, the query is inherited.
    function resolveUrl(baseUrl, uri) {
        const resolved = new URL(uri, baseUrl);
        if (!resolved.search) {
            const base = new URL(baseUrl);
            if (base.search) resolved.search = base.search;
        }
        return resolved.toString();
    }

    function parseByteRange(value, previousEnd) {
        // "length[@offset]"
        const [len, off] = String(value).split('@');
        const length = parseInt(len, 10);
        const offset = off !== undefined ? parseInt(off, 10) : previousEnd;
        return { offset, length };
    }

    function isMasterPlaylist(text) {
        return /#EXT-X-STREAM-INF/.test(text);
    }

    // Returns { variants: [...], audioGroups: { groupId: [media...] }, encrypted }
    function parseMaster(text, baseUrl) {
        const lines = text.split(/\r?\n/).map(l => l.trim());
        const variants = [];
        const audioGroups = {};
        let encrypted = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (line.startsWith('#EXT-X-SESSION-KEY:')) {
                const a = parseAttributes(line.slice('#EXT-X-SESSION-KEY:'.length));
                if (a.METHOD && a.METHOD !== 'NONE') encrypted = a.METHOD;
            } else if (line.startsWith('#EXT-X-MEDIA:')) {
                const a = parseAttributes(line.slice('#EXT-X-MEDIA:'.length));
                if (a.TYPE === 'AUDIO') {
                    (audioGroups[a['GROUP-ID']] = audioGroups[a['GROUP-ID']] || []).push({
                        uri: a.URI ? resolveUrl(baseUrl, a.URI) : null,
                        isDefault: a.DEFAULT === 'YES',
                        name: a.NAME || '',
                        language: a.LANGUAGE || ''
                    });
                }
            } else if (line.startsWith('#EXT-X-STREAM-INF:')) {
                const a = parseAttributes(line.slice('#EXT-X-STREAM-INF:'.length));
                let j = i + 1;
                while (j < lines.length && (lines[j] === '' || lines[j].startsWith('#'))) j++;
                if (j >= lines.length) continue;
                const res = (a.RESOLUTION || '').match(/(\d+)x(\d+)/);
                variants.push({
                    url: resolveUrl(baseUrl, lines[j]),
                    bandwidth: parseInt(a.BANDWIDTH || a['AVERAGE-BANDWIDTH'] || '0', 10),
                    width: res ? parseInt(res[1], 10) : 0,
                    height: res ? parseInt(res[2], 10) : 0,
                    codecs: a.CODECS || '',
                    audioGroup: a.AUDIO || null
                });
                i = j;
            }
        }
        return { variants, audioGroups, encrypted };
    }

    // preference: 'highest' | 'lowest' | '720' (max height)
    function pickVariant(variants, preference) {
        if (!variants.length) return null;
        const sorted = variants.slice().sort((a, b) => (b.height - a.height) || (b.bandwidth - a.bandwidth));
        if (!preference || preference === 'highest') return sorted[0];
        if (preference === 'lowest') return sorted[sorted.length - 1];
        const max = parseInt(preference, 10);
        if (!max) return sorted[0];
        return sorted.find(v => v.height && v.height <= max) || sorted[sorted.length - 1];
    }

    function pickAudio(master, variant) {
        if (!variant || !variant.audioGroup) return null;
        const group = master.audioGroups[variant.audioGroup] || [];
        const withUri = group.filter(a => a.uri);
        if (!withUri.length) return null; // audio is muxed into the video variant
        return withUri.find(a => a.isDefault) || withUri[0];
    }

    // Returns { init, segments, encrypted, endList, totalDuration }
    // init: { url, byteRange } | null
    // segments: [{ url, duration, byteRange }]
    function parseMedia(text, baseUrl) {
        const lines = text.split(/\r?\n/).map(l => l.trim());
        const segments = [];
        let init = null;
        let encrypted = null;
        let endList = false;
        let pendingDuration = 0;
        let pendingRange = null;
        let lastRangeEnd = 0;
        let totalDuration = 0;

        for (const line of lines) {
            if (!line) continue;
            if (line.startsWith('#EXT-X-KEY:')) {
                const a = parseAttributes(line.slice('#EXT-X-KEY:'.length));
                if (a.METHOD && a.METHOD !== 'NONE') encrypted = a.METHOD;
            } else if (line.startsWith('#EXT-X-MAP:')) {
                const a = parseAttributes(line.slice('#EXT-X-MAP:'.length));
                init = {
                    url: resolveUrl(baseUrl, a.URI),
                    byteRange: a.BYTERANGE ? parseByteRange(a.BYTERANGE, 0) : null
                };
            } else if (line.startsWith('#EXTINF:')) {
                pendingDuration = parseFloat(line.slice('#EXTINF:'.length)) || 0;
            } else if (line.startsWith('#EXT-X-BYTERANGE:')) {
                pendingRange = parseByteRange(line.slice('#EXT-X-BYTERANGE:'.length), lastRangeEnd);
            } else if (line === '#EXT-X-ENDLIST') {
                endList = true;
            } else if (!line.startsWith('#')) {
                if (pendingRange) lastRangeEnd = pendingRange.offset + pendingRange.length;
                segments.push({
                    url: resolveUrl(baseUrl, line),
                    duration: pendingDuration,
                    byteRange: pendingRange
                });
                totalDuration += pendingDuration;
                pendingDuration = 0;
                pendingRange = null;
            }
        }
        return { init, segments, encrypted, endList, totalDuration };
    }

    const api = { parseAttributes, resolveUrl, isMasterPlaylist, parseMaster, pickVariant, pickAudio, parseMedia };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.HlsParser = api;
})(typeof self !== 'undefined' ? self : this);
