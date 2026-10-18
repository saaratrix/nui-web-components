## Vendor folder 
It contains symlinks towards all the third party dependencies.

* [https://github.com/libass/JavascriptSubtitlesOctopus](https://github.com/libass/JavascriptSubtitlesOctopus)
  * Used in: [src/video-player/subtitles-octopus](src/video-player/subtitles-octopus)

## Assets folder
It contains some assets that are used in different components as an overview. 
However, for example icons have a .ts file with the svg icons as strings so each component is stand-alone.

* video-player
  * fullscreen.svg, fullscreen-exit.svg, play.svg, subtitles_sub.svg
    * Icons file: [video-player-icons](src/video-player/video-player-icons.ts)