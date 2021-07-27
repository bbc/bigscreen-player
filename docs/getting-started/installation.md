# Installation

## NPM
```bash
$ npm install bigscreen-player
```

## Manual

You can use the bundle hosted on [unpkg](https://unpkg.com/) in your HTML file directly:
```html
<!-- index.html -->

<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta charset="UTF-8">
</head>
<body>
  <script>
    window.bigscreenPlayer.playbackStrategy = 'msestrategy';

    // Initialise BSP here

  </script>
  <script src="https://unpkg.com/:bigscreen-player@:latest/:bigscreen-player.js"></script>
</body>
</html>
```

[→ Next - Usage](getting-started/usage.md)