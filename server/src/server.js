// Local variables
const PORT = 3000;

// External modules
import app from './app.js';

app.listen(PORT, function (err) {
  if (err) console.error(`Error listening on port ${PORT}: ${err}`);
  else console.log(`Server listening on port ${PORT}`);
});
