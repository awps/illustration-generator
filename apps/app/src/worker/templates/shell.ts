export function shellPage(imagesDomain: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Illustragen</title>
  <link rel="stylesheet" href="/assets/main.css">
  <script>window.__CONFIG__={imagesDomain:"${imagesDomain}"}</script>
  <script type="module" src="/assets/main.js"></script>
</head>
<body>
  <div id="root"></div>
</body>
</html>`
}