The following shows how to use the Web player. You can find all the source codes at https://github.com/visionular/example-auroralive-player-web

1. Download the latest js file `curl -O https://auroralive-player.s3.amazonaws.com/vX.Y.Z/auroralive-player.js`

2. Import the js library.

   ```js
   import { AuroraLivePlayer } from './auroralive-player';
   ```

3. Get the element of video

   ```
   const video = document.querySelector('video');
   ```

4. Create an instance of player, passing some params:

   ```
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

5. start the player

   ```js
   await player.load(new URL(url), token.value);
   ```
