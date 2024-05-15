# Prerequisite

This example was tested in Chrome v115.

# Code writing guild

The following shows how to use the Web player. You can find all the source codes at https://github.com/visionular/example-auroralive-player-web.

1. Download the latest js file `curl -O https://download.visionular.com/vX.Y.Z/auroralive-player.js`.

2. Import the js library.

   ```js
   import { AuroraLivePlayer } from './auroralive-player';
   ```

3. Get the element of video.

   ```js
   const video = document.querySelector('video');
   ```

4. Create an instance of player, passing some params:

   ```js
   let player: AuroraLivePlayer;
   if (video) {
     player = new AuroraLivePlayer({
       video: video,
       iceServers: iceServers,
       debug: true,
       statsTypeFilter: '^candidate-*|^inbound-rtp',
       retry: 0
     });
   }
   ```

5. start the player.

   ```js
   await player.load(new URL(url), token.value);
   ```

# Run example server

This example needs node v18+.

## run server locally

1. `npm ci`
2. `npm run serve`
3. open browerser at localhost:2345

## try online

1. visit `player.visionular.com`
2. disable `chrome://flags/#block-insecure-private-network-requests` if you are using a non-https endpoint url.
3. fill url and token
4. click play
