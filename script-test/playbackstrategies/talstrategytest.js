// require(
//   [
//     'bigscreenplayer/playbackstrategy/talstrategy',
//     'bigscreenplayer/models/windowtypes',
//     'squire'
//   ],
//   function (TalStrategy, WindowTypes, Squire) {
//     describe('TAL Strategy', function () {
//       var injector = new Squire();
//       var mediaPlayer = 'mediaPlayer';
//       var livePlayer = 'livePlayer';
//       var config = 'config';

//       var legacyAdapter;
//       var mockDevice;

//       beforeEach(function () {
//         mockDevice = jasmine.createSpyObj('mockDevice', ['getMediaPlayer', 'getLivePlayer', 'getConfig']);
//       });

//       fit('calls LegacyAdapter with a live media player', function () {
//         TalStrategy(WindowTypes.STATIC, null, null, null, null, mockDevice);

//         expect(mockDevice.getMediaPlayer).toHaveBeenCalledWith();
//       });
//     });
//   });
