// Minimal fragmented-MP4 (CMAF) helpers: merge a video-only and an audio-only
// HLS rendition into one fragmented MP4 without re-encoding.
// Pure functions on Uint8Array, no DOM / chrome APIs, so they can be tested in Node.
(function (root) {
    'use strict';

    const textDecoder = new TextDecoder('latin1');

    function fourcc(u8, pos) {
        return textDecoder.decode(u8.subarray(pos, pos + 4));
    }

    function readU32(u8, pos) {
        return ((u8[pos] << 24) | (u8[pos + 1] << 16) | (u8[pos + 2] << 8) | u8[pos + 3]) >>> 0;
    }

    function writeU32(u8, pos, value) {
        u8[pos] = (value >>> 24) & 0xff;
        u8[pos + 1] = (value >>> 16) & 0xff;
        u8[pos + 2] = (value >>> 8) & 0xff;
        u8[pos + 3] = value & 0xff;
    }

    // List the child boxes found in u8[start, end).
    function readBoxes(u8, start = 0, end = u8.length) {
        const boxes = [];
        let pos = start;
        while (pos + 8 <= end) {
            let size = readU32(u8, pos);
            const type = fourcc(u8, pos + 4);
            let headerSize = 8;
            if (size === 1) {
                // 64-bit size (only the low 32 bits are supported)
                if (readU32(u8, pos + 8) !== 0) throw new Error('Box larger than 4 GB is not supported');
                size = readU32(u8, pos + 12);
                headerSize = 16;
            } else if (size === 0) {
                size = end - pos;
            }
            if (size < headerSize || pos + size > end) throw new Error('Corrupt MP4 box "' + type + '" at ' + pos);
            boxes.push({ type, start: pos, size, headerSize, end: pos + size });
            pos += size;
        }
        return boxes;
    }

    function children(u8, box) {
        return readBoxes(u8, box.start + box.headerSize, box.end);
    }

    function find(u8, boxes, type) {
        return boxes.find(b => b.type === type) || null;
    }

    function buildBox(type, ...payloads) {
        let len = 8;
        for (const p of payloads) len += p.length;
        const out = new Uint8Array(len);
        writeU32(out, 0, len);
        for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
        let pos = 8;
        for (const p of payloads) {
            out.set(p, pos);
            pos += p.length;
        }
        return out;
    }

    function slice(u8, box) {
        return u8.slice(box.start, box.end);
    }

    // --- Encryption detection -------------------------------------------------
    // Protected (DRM / CENC) streams are not supported; refuse them instead of
    // writing a file that cannot be played.
    function isEncryptedInit(init) {
        const marks = ['encv', 'enca', 'sinf', 'tenc', 'pssh'];
        for (let i = 4; i + 4 <= init.length; i++) {
            const c = init[i];
            if (c !== 0x65 && c !== 0x73 && c !== 0x74 && c !== 0x70) continue; // e, s, t, p
            if (marks.includes(fourcc(init, i))) return true;
        }
        return false;
    }

    // --- Track-id helpers ------------------------------------------------------
    function tkhdTrackIdOffset(u8, tkhd) {
        const payload = tkhd.start + tkhd.headerSize;
        const version = u8[payload];
        return payload + (version === 1 ? 20 : 12);
    }

    function mvhdNextTrackIdOffset(u8, mvhd) {
        const payload = mvhd.start + mvhd.headerSize;
        const version = u8[payload];
        return payload + (version === 1 ? 108 : 96);
    }

    function describeInit(init) {
        const top = readBoxes(init);
        const ftyp = find(init, top, 'ftyp');
        const moov = find(init, top, 'moov');
        if (!moov) throw new Error('Init segment has no moov box');
        const moovKids = children(init, moov);
        const mvhd = find(init, moovKids, 'mvhd');
        const traks = moovKids.filter(b => b.type === 'trak');
        const mvex = find(init, moovKids, 'mvex');
        if (!mvhd || !traks.length || !mvex) throw new Error('Unsupported init segment layout');
        const mvexKids = children(init, mvex);
        const trexes = mvexKids.filter(b => b.type === 'trex');

        const tracks = traks.map(trak => {
            const kids = children(init, trak);
            const tkhd = find(init, kids, 'tkhd');
            if (!tkhd) throw new Error('trak without tkhd');
            const id = readU32(init, tkhdTrackIdOffset(init, tkhd));
            return { trak, id };
        });
        return { init, ftyp, moov, mvhd, tracks, trexes };
    }

    // Build one init segment holding the video track(s) followed by the audio track(s).
    // Returns { init, audioTrackIdFrom, audioTrackIdTo }.
    function mergeInits(videoInit, audioInit) {
        const v = describeInit(videoInit);
        const a = describeInit(audioInit);

        const usedIds = new Set(v.tracks.map(t => t.id));
        let nextId = Math.max(...usedIds) + 1;
        const idMap = {}; // original audio id -> new id
        const audioTraks = [];
        const audioTrexes = [];

        for (const t of a.tracks) {
            const bytes = slice(audioInit, t.trak);
            const kids = children(bytes, { start: 0, headerSize: 8, end: bytes.length });
            const tkhd = find(bytes, kids, 'tkhd');
            let newId = t.id;
            if (usedIds.has(newId)) newId = nextId++;
            usedIds.add(newId);
            idMap[t.id] = newId;
            writeU32(bytes, tkhdTrackIdOffset(bytes, tkhd), newId);
            audioTraks.push(bytes);
        }
        for (const trex of a.trexes) {
            const bytes = slice(audioInit, trex);
            const origId = readU32(bytes, 12); // 8 header + 4 version/flags
            if (idMap[origId] === undefined) continue;
            writeU32(bytes, 12, idMap[origId]);
            audioTrexes.push(bytes);
        }

        const mvhd = slice(videoInit, v.mvhd);
        writeU32(mvhd, mvhdNextTrackIdOffset(mvhd, { start: 0, headerSize: 8 }), Math.max(...usedIds) + 1);

        const videoTraks = v.tracks.map(t => slice(videoInit, t.trak));
        const videoTrexes = v.trexes.map(t => slice(videoInit, t));
        const mvex = buildBox('mvex', ...videoTrexes, ...audioTrexes);
        const moov = buildBox('moov', mvhd, ...videoTraks, ...audioTraks, mvex);
        const ftyp = v.ftyp ? slice(videoInit, v.ftyp) : new Uint8Array(0);

        const out = new Uint8Array(ftyp.length + moov.length);
        out.set(ftyp, 0);
        out.set(moov, ftyp.length);

        // Only single-audio-track renditions are remapped in fragments (the usual case).
        const fromIds = Object.keys(idMap).map(Number);
        return { init: out, idMap, firstAudioIdFrom: fromIds[0], firstAudioIdTo: idMap[fromIds[0]] };
    }

    // Keep only moof+mdat of a media segment and rewrite the track id in every tfhd.
    function prepareFragment(segment, fromId, toId) {
        const top = readBoxes(segment);
        const keep = [];
        for (const box of top) {
            if (box.type === 'moof') {
                const bytes = slice(segment, box);
                if (fromId !== toId) remapMoof(bytes, fromId, toId);
                keep.push(bytes);
            } else if (box.type === 'mdat') {
                keep.push(slice(segment, box));
            }
            // styp / sidx / prft / emsg are intentionally dropped
        }
        if (!keep.length) throw new Error('Segment contains no moof/mdat');
        let len = 0;
        for (const k of keep) len += k.length;
        const out = new Uint8Array(len);
        let pos = 0;
        for (const k of keep) {
            out.set(k, pos);
            pos += k.length;
        }
        return out;
    }

    function remapMoof(moof, fromId, toId) {
        const kids = children(moof, { start: 0, headerSize: 8, end: moof.length });
        for (const traf of kids.filter(b => b.type === 'traf')) {
            const tkids = children(moof, traf);
            const tfhd = find(moof, tkids, 'tfhd');
            if (!tfhd) continue;
            const payload = tfhd.start + tfhd.headerSize;
            const flags = (moof[payload + 1] << 16) | (moof[payload + 2] << 8) | moof[payload + 3];
            if (flags & 0x000001) {
                // base-data-offset-present => absolute offsets, which break when fragments move
                throw new Error('Unsupported fragment layout (absolute base data offset)');
            }
            const idPos = payload + 4;
            if (readU32(moof, idPos) === fromId) writeU32(moof, idPos, toId);
        }
    }

    // Order the video and audio segments of two renditions by their start time so the
    // merged file interleaves them. Returns [{ track: 'v'|'a', index }].
    function interleave(videoSegments, audioSegments) {
        const order = [];
        let vi = 0;
        let ai = 0;
        let vt = 0;
        let at = 0;
        while (vi < videoSegments.length || ai < audioSegments.length) {
            const takeVideo = ai >= audioSegments.length || (vi < videoSegments.length && vt <= at);
            if (takeVideo) {
                order.push({ track: 'v', index: vi });
                vt += videoSegments[vi].duration || 0;
                vi++;
            } else {
                order.push({ track: 'a', index: ai });
                at += audioSegments[ai].duration || 0;
                ai++;
            }
        }
        return order;
    }

    const api = { readBoxes, isEncryptedInit, mergeInits, prepareFragment, interleave, describeInit };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.Fmp4Mux = api;
})(typeof self !== 'undefined' ? self : this);
