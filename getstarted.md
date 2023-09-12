The following shows how to use the Web player with a script tag.

# Setup With Script Tag

To set up the AuroraLive player using the script tag:

1. Download the latest js file `curl -O https://auroralive-player.s3.amazonaws.com/vX.Y.Z/auroralive-player.js`

1. Include the following tag (for the latest version of the player).

   ```
   <script src="https://player.live-video.net/1.21.0/amazon-ivs-player.min.js">
   ```

1. Once amazon-ivs-player.min.js is loaded, it adds an IVSPlayer variable to the global context.
   This is the library you will use to create a player instance. First, check isPlayerSupported to
   determine if the browser supports the IVS player:

   ```
   if (IVSPlayer.isPlayerSupported) { ... }
   ```

   Then, to create a player instance, call the create function on the IVSPlayer object.

   ```
   const player = IVSPlayer.create();
   ```

   The Amazon IVS Player SDK for Web uses web workers to optimize video playback.

1. Load and play a stream using the load and play functions on the player instance:

   ```
   player.load("PLAYBACK_URL");
   player.play();
   ```

   where PLAYBACK_URL is the URL returned from the Amazon IVS API when a stream key is requested.

# Sample Code

In this example, replace PLAYBACK_URL with the URL of the source stream you want to load. The
example uses the latest version of the Amazon IVS player.

```
   <script src="https://player.live-video.net/1.21.0/amazon-ivs-player.min.js"></script>
   <video id="video-player" playsinline></video>
   <script>
    if (IVSPlayer.isPlayerSupported) {
    const player = IVSPlayer.create();
    player.attachHTMLVideoElement(document.getElementById('video-player'));
    player.load("PLAYBACK_URL");
    player.play();
    }
   </script>
```

In the <video> tag, playsinline is required for inline playback on iOS Safari. See https://webkit.org/
blog/6784/new-video-policies-for-ios/.
