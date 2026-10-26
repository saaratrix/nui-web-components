export var SubtitleType;
(function (SubtitleType) {
    SubtitleType[SubtitleType["Vtt"] = 0] = "Vtt";
    SubtitleType[SubtitleType["Srt"] = 1] = "Srt";
    SubtitleType[SubtitleType["Ssa"] = 2] = "Ssa";
    SubtitleType[SubtitleType["Ass"] = 3] = "Ass";
})(SubtitleType || (SubtitleType = {}));
export function getSubtitleTypeFromName(name) {
    const extension = (name.split('.').pop() ?? '').toLowerCase();
    switch (extension) {
        case 'ass':
            return SubtitleType.Ass;
        case 'ssa':
            return SubtitleType.Ssa;
        case 'srt':
            return SubtitleType.Srt;
        case 'vtt':
            return SubtitleType.Vtt;
        default:
            return;
    }
}
