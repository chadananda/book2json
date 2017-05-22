## Book2JSON

Converts books from various html formats such as Gutenberg into a JSON block format. Along the way it also cleans up text artifacts such as straight quotes. Outputs an array of block objects with clean HTML content and some block classes.

### Install

``` npm install --save book2json ```

### Usage

```javascript

var book2json = require('book2json');

// load a file in Gutenberg html format
fs.readFile(bookPath, function(err, content) { 
  // translate into JSON
  book2json.importGutenbergHtml(content)
    .then(function(json){
      // do something with your JSON data    
    });
});

### Tests

This module includes some Mocha/Chai tests which can be run with:

``` npm test ```