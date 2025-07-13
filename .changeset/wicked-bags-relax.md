---
'@webav/internal-utils': patch
'@webav/av-cliper': patch
---

fix: the first keyframe is trusted as an IDR frame by default for compatibility with certain video files that have abnormal annotations.
