Budget jira board!

* File picker:
    - fullpage-dnd should control the text 'or drag and drop it anywhere.'  currently always visible.

* Video player:
    * Expose subtitleChanged event to video-player.
    * Not moving mouse will hide controls, minorly important
    * Subtitles:
        * If no subtitle, change icon to subtitles off
        * Change "Languages" to just Subtitles, including classes etc.
        * Style the subtitles config menu.
        * Add text offset setting?
        * Add VTT support, 
        * Add SRT support.
        * Add extension for subtitles picker to use an api to get available subtitles instead, eg media server.
        * Add extension for subtitleAdded, eg might want to upload file if added.
    * Add the other controls
        * Play button
        * Progress bar
        * Mute button
        * Volume bar
    * Improve controls opacity behaviour:
        * If paused always show
        * Move into web component and just improve the logic a bit with opacity.
    * Add thumbnail preview on hover.
    * Add picture in picture mode?
