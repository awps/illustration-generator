export function shellPage(apiUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ImaGen Dashboard</title>
  <link rel="stylesheet" href="/assets/main.css">
  <script>window.__CONFIG__={apiUrl:"${apiUrl}"}</script>
  <script type="module" src="/assets/main.js"></script>
</head>
<body>
  <div id="root"></div>
</body>
</html>`
}