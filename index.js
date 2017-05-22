// Book Import Tools

// Translates books from various sources into JSON structure 

'use strict';

var env = process.env.NODE_ENV || 'development';

// require: fs-extra, bluebird, cherio, axios
var cheerio = require('cheerio'),
  axios = require('axios'),
  //Bluebird = require("bluebird"),
  fs = require('fs-extra'),
  //fs_oldschool = require('fs'),
  langs = require('langs'),
  ent = require('ent'),
  _ = require('lodash'),
  mime = require('mime-types'),
  rp = require('request-promise-native'),
  createThrottle = require('async-throttle'),
  extract = require('extract-zip'),
  smartquotes = require('smartquotes'),
  removeDiacritics = require('diacritics').remove,
  toArabic = require('roman-numerals').toArabic,
  sanitizeHtml = require('sanitize-html'),
  detectCharacterEncoding = require('detect-character-encoding'),
  toLaxTitleCase = require('titlecase').toLaxTitleCase,
  Iconv = require('iconv').Iconv;
 



// // Import Gutenberg HTML
// // Requires URL to Gutenberg HTML and dest directory
// // Returns a promise which eventually resolves into a JSON book
// // IMG files in the JSON book are stored in a local /img/ folder
module.exports.importGutenbergHtml = function(bookPath, destDir) {
  return new Promise(function(resolve, reject) {
    fs.readFile('./book_template.html', 'utf8', function(err, TEMPLATE){
      //fs.ensureDir(destDir, function(){
        fs.readFile(bookPath, function(err, content) {  // load as buffer
          // since we cannot know encoding in advance, load as buffer
          var encoding = detectCharacterEncoding(content).encoding; // detect encoding
          var iconv = new Iconv(encoding, 'UTF-8'); // convert to utf-8 buffer
          var buffer = iconv.convert(content);
          var html = buffer.toString('utf8'); // convert to utf-8 string
          if (html.indexOf('�')>-1) console.log('ERROR, getting illegal � characters in importGutenbergHtml');

          var book = {meta: {}, content: [], files: []};
          // try to get metadata
          book.meta = _parseGutenbergHTMLMetadata(html, bookPath);
          _parseGutenbergHTMLContentBlocks(html, book);
          
          // get a total word count & length
          book.meta.wordcount = 0;
          book.content.forEach(function(bl) {
            book.meta.wordcount += bl.content.replace(/\s+/g, ' ').split(' ').length
            book.meta.charcount += bl.content.replace(/\s+/g, ' ').replace(/[^a-zA-Z0-9áÁúÚíÍḥḤḍḌẓẒṭṬ ]/g, '').trim().length
          }) 

          book.type = 'book';
          book.meta.status = 'staging';

          if (destDir) fs.ensureDir(destDir, function(){
            var newDest = destDir + book.meta.bookid;
            fs.ensureDir(newDest + '/img', function(){
              fs.writeFile(newDest + '/book.json', JSON.stringify(book, null, 2));
              _outputBookHTML(book, newDest + '/book.html', TEMPLATE);
              setTimeout(function() {
                resolve(book);
              }, 500);
            })
          })
          else resolve(book)
        })
      //})
    })

    // return fsp.readFile('./book_template.html', 'utf8').then(function(TEMPLATE){
    //   return fsp.ensureDir(destDir).then(fsp.readFile(bookPath)).then(function(html) {
//
//
//
// //           //  _outputBookHTML(book, newDest + '/book.html', __dirname + '/book_template.html');
// //
// //             // fs.writeFile(newDest + '/book.html', _bookContentToHTML(book));
// //             // now fetch and save all images
// //             // we should be able to fetch images using the same cookie
// //             var throttle = createThrottle(8);
// //             var urls = [];
// //             book.files.map(function(item){
// //               var url = item.sourceUrl;
// //               var dest = newDest + '/img/'+ url.split('/').pop();
// //               if (!fs.existsSync(dest)) urls.push(url)
// //             });
// //
// //             Promise.all(urls.map((url) => throttle(async () => {
// //               var dest = newDest + '/img/'+ url.split('/').pop();
// //               await rp({url: url, jar: true, encoding: null}).then(function(data) {
// //                 fs.writeFile(dest, data, 'binary');
// //                 //console.log('Fetched file: '+  url.split('/').pop());
// //               });
// //             })))
// //             .then(() => resolve(book))
// //
//
//         });
  //     });
  //   });
  });
}





module.exports.uploadZipBook = function(bookPath){
  var zipName = bookPath.substring(bookPath.lastIndexOf('/')+1).slice(0, -4);
  var zipFile = bookPath.substring(bookPath.lastIndexOf('/')+1);
  var sourceFile = __dirname +"/import/"+zipFile;
  var sourceFolder = __dirname +"/import";
  var sourceTextFile = sourceFolder+'/'+zipName+'/'+zipName+'.htm';
  var book = {};
  var content = "";

  return new Promise(function (fulfill, reject){
    // ensure the import folder exists
    fs.ensureDir(sourceFolder, function (err){
      if (err) reject(err);
      // upload/move the zip folder to import
      else fs.copy(bookPath, sourceFile, function (err, data){
        if (err) reject(err)
        // unzip folder
        else extract(sourceFile, {dir: sourceFolder}, function (err){
          if (err) reject(err)
          // delete zip file
          else fs.unlink(sourceFile, function(err){
              if (err) reject(err)
              // load the html into content
              else fs.readFile(sourceTextFile, function (err, data){
                if (err) reject(err)
                else fulfill(true)
              });
          });
        });
      });
    });
  })
  .then( function(data){
   // book.meta =  _parseGutenbergHTMLMetadata(data, bookPath);
    return true;
  });
}


function _fetchImages(list, dir) {
  list.reduce(function(cur, next) {
    return cur.then(function() {
        return http.post("/delete.php?id=" + next);
    });
  }, RSVP.resolve()).then(function() {
      //all executed
  });

}

function _genDiffDisplay(src, dest) {
  var diff = new Diff(); // options may be passed to constructor; see below
  var textDiff = diff.main('text1', 'text2'); // produces diff array
  diff.prettyHtml(textDiff); // produces a formatted HTML string
}

function _generateBookID(author, title, lang) {
  var result = [];
  // remove all punctuation from author and Title
  author = author.replace(/[^a-zA-Z ]/g, '')
  title = title.replace(/[^a-zA-Z ]/g, '')
  // remove all diacritics
  // passed test: console.log('ÁáÍíÚúḤḥṬṭḌḍẒẓ', removeDiacritics('ÁáÍíÚúḤḥṬṭḌḍẒẓ'))
  author = removeDiacritics(author)
  title = removeDiacritics(title)

  // get author last name
  result.push(author.toLowerCase().split(' ').slice(-1).pop()); // author last name
  result.push(title.toLowerCase().split(' ').filter(function(word) { // title main words
    return ['the', 'an', 'of', 'for', 'a'].indexOf(word)<0;
  }).slice(0,5).join('_')); // no more than 5 main words
  result.push(lang);
  return result.join('-');
}

function _html2text(html) {
  html = html.trim();
  if (!html) return;
  var $ = cheerio.load(html);
  var html = $('html *').contents().map(function() {
    return (this.type === 'text') ? $(this).text().trim()+' ' : '';
  }).get().join('\n\n');
  // clean up
  // reduce multiple spaces to one space
  // reduce blank links to /n
  // remove multipl blank lines
  html = html.replace(/[\ \t]+/g, ' ');
  html = html.replace(/([\ \t]+)?\n([\ \t]+)?/g, '\n');
  html = html.replace(/\n{3,}/g, '\n\n');


  return html;
}

function _outputBookHTML(book, dest, template) {
  var body = _bookContentToHTML(book);
  var html = template.replace(/{{language}}/g, book.meta.language);
  html = html.replace(/{{author}}/g, book.meta.author);
  html = html.replace(/{{bookid}}/g, book.meta.bookid);
  html = html.replace(/{{title}}/g, book.meta.title);
  html = html.replace(/{{body}}/g, body);
  // replace other bits now

  fs.writeFile(dest, html, 'utf8', function(err) {
    if (err) console.log(err);
    else {
      // //console.log('Wrote book to: '+ dest);
      // var diffdest = dest.replace(/\.(.*?)$/m, '_diff.$1');
      // //console.log(diffdest);
      // fs.readFile(book.meta.source, 'utf8', function(err, srcHTML){
      //   //console.log(srcHTML);
      //   var srcTxt = _html2text(srcHTML);
      //   var dstTxt = _html2text(html);
      //   var diff = new Diff(); // options may be passed to constructor; see below
      //   var textDiff = diff.main(dstTxt, srcTxt); // produces diff array
      //     diff.cleanupSemantic(textDiff);
      //   var diffHTML = diff.prettyHtml(textDiff); // produces a formatted HTML string
      //   fs.writeFile(diffdest, diffHTML, 'utf8')
      // })
    }
  });
}

function _bookContentToHTML(book) {
  var body= '';
  book.content.forEach(function(block){
    // title|header|subhead|par|note|illustration|hr
    var tag = {
      title: 'h1',
      header: 'h2',
      subhead: 'h3',
      par: 'p',
      note: 'aside',
      illustration: 'p',
      hr: 'hr',
      unknown: 'div' // this way we can easily find all the unknown blocks in output
    }[block.type];
    var classes = block.classes.length>0 ? ` class="${block.classes.join(' ')}"` : '';
    var parnum = block.parnum ? ` data-parnum="${block.parnum}"` : '';
    var secnum = block.secnum ? ` data-section="${block.secnum}"` : '';
    var lang = '';
    var language = block.language ? block.language : book.meta.language;
    var prefix = tag=='h1'?'\n\n\n\n\n':(tag=='h2'?'\n\n\n\n':(tag=='h3'?'\n\n\n':(tag=='hr'?'\n\n\n':'')))
    if (language && language != 'en') {
      lang = ` lang="${language}"`;
      lang += ['fa','ar','iw'].indexOf(language)>-1 ? ` dir="rtl"` : '';
    }
    body+= `${prefix}<${tag}${classes}${parnum}${secnum}${lang}>${block.content}</${tag}>\n\n`
  });
  return body;
}



function _parseGutenbergHTMLMetadata(html, src) {
  if (!html) {
    console.log("Error, no html content in _parseGutenbergHTMLMetadata ")
    return;
  }
  var rx, arr;
  var meta = {
    "bookid": "",
    "title": "",
    "subtitle": "",
    "author": "",
    "category": "story",
    "charcount": 0,
    "wordcount": 0,
    "difficulty": "",
    "language": "en",
    "description": "",
    "sectionName": "",
    "numbering": "x.x",
    "published": false,
    "pubType": "Unpublished",
    "importStatus": "staging",
    "version": "",
    "coverimg": ""
  }
  // title line
  rx = /^Title:[ ]*(.*?)$/im;
  arr = rx.exec(html);
  meta.title = arr[1].trim();
  meta.title = smartquotes(meta.title);
  if (meta.title.indexOf(',')>-1) meta.title = meta.title.split(',')[0];
  if (meta.title.indexOf(';')>-1) meta.title = meta.title.split(';')[0];
  // remove parenthesis and extra spaces
  meta.title = meta.title.replace(/\([^)]*\)*/g, "").replace(/[\s]+/g, ' ').trim()
  // author
  rx = /^Author:[ ]*(.*?)$/im;
  arr = rx.exec(html);
  meta.author = arr[1].trim();
  // remove parenthesis and extra spaces
  meta.author = meta.author.replace(/\([^)]*\)*/g, "").replace(/[\s]+/g, ' ').trim()
  if (meta.author.indexOf(',')>-1) meta.author = meta.author.split(',')[0];

  // language
  rx = /^Language:[ ]*(.*?)$/im;
  arr = rx.exec(html);
  var lang = arr[1].trim();
  if (lang) lang = langs.where("name", lang)['1']; // "English" > "en"
  if (lang) meta.language = lang
   else { // if not in Gutenberg header, look in HTML attribute
      rx = /<html .*?lang="(.*?)">/i;
      arr = rx.exec(html);
      meta.language = arr[1].trim();
   }
  // src
  meta.source = src;
  // generate book code as `author-title_words-lang` like `dumas-count_monte_cristo-en`
  meta.bookid = _generateBookID(meta.author, meta.title, meta.language);
  return meta;
}

function _cleanClasses(list) {
  if (!list) return []
  if (typeof list==='string' || list instanceof String) list = list.trim().split(' ')
  list = list.map(item => item.toLowerCase().trim()).filter(item => item)
  list = _.uniq(list)
  return list
}
function _addClass(block, add) {
  block.classes = _cleanClasses(block.classes).concat(_cleanClasses(add))
  block.classes = _cleanClasses(block.classes)
  return block.classes
}
function _removeClass(block, rem) {
  block.classes = _cleanClasses(block.classes)
  rem = _cleanClasses(rem)
  block.classes = block.classes.filter(item => rem.indexOf(item)<0)
  return block.classes
}
function _hasClass(block, classes) {
  var result = false;
  block.classes = _cleanClasses(block.classes)
  classes = _cleanClasses(classes)
  classes.forEach(function(item){ if (block.classes.indexOf(item)>-1) result = true})
  return result
}

function _fileExt(filename){
  var re = /(?:\.([^.]+))?$/;
  return re.exec(filename)[1];
}
function _secnum(header) { // try to figure out the section number from the section header
  // CHAPTER 1. The Chapter Title
  // CHAPTER 1
  // CHAPTER 1.
  // CHAPTER I.
  // I.
  // I
  // [ 1 ]
  header = header.trim();
  var rx = /^(CHAPTER|SECTION|SELECTION|ADVENTURE|ACT)?(\s+)([0-9]+?)(\.|$|<br)/im;
  var arr = rx.exec(header);
  if (arr && arr.length>2) return arr[3].trim();
  // in case of Roman numberal chapter
  else {
    // case of entire line (best)
    var rx = /^(CHAPTER|SECTION|SELECTION|ADVENTURE|ACT)?(\s+)?([lxciv]+?)(\.|\s|$|<br)/im;
    var arr = rx.exec(header);
    if (arr && arr.length>2) return toArabic(arr[3].trim());
     else {
       // case of beginning of line
       var rx = /^(CHAPTER|SECTION|SELECTION|ADVENTURE|ACT)?(\s+)?([lxciv]+?)(\.|$|<br)/im;
       var arr = rx.exec(header);
       if (arr && arr.length>2) return toArabic(arr[3].trim());
       else {
         var rx = /^\s*\[\s*([0-9])\s*\]\s*$/im;
         var arr = rx.exec(header);
         if (arr && arr.length>1) return arr[1].trim();
       }
     }

  }
}
function _isHeader(str) {
  str = str.trim();
  return str.match(/^\s*(CHAPTER|SECTION|SELECTION|ADVENTURE|ACT)\s+([0-9LIVXC]+)\s*$/im)
    || str.match(/^\s*(CHAPTER|SECTION|SELECTION|ADVENTURE|ACT)\s+([0-9LIVXC]+)(\.|<br)/im)
    || str.match(/^\s*([0-9LIVXC]+)(\.)/m)
    || str.match(/^\s*([0-9LIVXC]+)\s*$/im)
    //<h2>\s+\[\s*[0-9LXVIC]\s*\]\s+<\/h2>
    || str.match(/^\s*\[\s*([0-9LIVXC]+)\s*\]\s*/m)
}
function _stripTags(html, allowed) {
  if (!Array.isArray(allowed)) allowed = ['b','i','em','strong','a','img','u','br','q']
  var config = {
    allowedTags: allowed,
    allowedAttributes: {'a': ['href']} // this would have to be different to allow Ocean footnotes
  }
  return sanitizeHtml(html, config)
}
function _sanitizeHTML(html) {
  // var div = cheerio.createElement('div');
  //
  // div.innerHTML=html
  // return (div.innerHTML);
}

function _smartQuotes(html) {
  html = html.replace(/&quot;/ig, '"').replace(/&apos;/ig, "'");
  //var old = html;
  html = smartquotes(html);
  //if (old != html) console.log(old,html);
  //if (html.indexOf('&quot;')>-1) console.log('WTH?? ', html)
  return html;
}

/*******************/
function _parseGutenbergHTMLContentBlocks(html, book) {
  //console.log(book.meta.title)
  //if (html.indexOf('�')>-1) console.log('ERROR, getting illegal � characters in parse');

  // remove header
  html = html.replace(/[\s\S]+?<body>/im, '');

  html = html.replace(/<head>[\s\S]+?<\/head>/im, '');
  // remove gutenberg parts
  // End of Project Gutenberg
  html = html.replace(/<pre( xml\:space=\"preserve\")?>[\s\S]+?Project\s+Gutenberg[\s\S]+?<\/pre>/m, '');
  html = html.replace(/[\s]+End of (the)?\s*Project Gutenberg[\s\S]+?<\/pre>/im, '</pre>')
             .replace(/<pre( xml:space="preserve")?>[\s]*<\/pre>/m, '');

  // replace remaining pre blocks with <p class="pre">
  html = html.replace(/<pre( xml:space="preserve")?>([\s\S]*)<\/pre>/igm, '\n<p class="pre blockquote">$2</p>\n\n')

  // weird div-based formatting for poems
  html = html.replace(/<div class="poem"><div class="stanza">([\s\S]+?)<\/div><\/div>/gim, '<p class="verse">$1</p>')

  // remove center and standardize <hr>
  html = html.replace(/<(\/)?center>/gi, '');
  html = html.replace(/<hr.*?>/gi, '<hr>').replace(/<br.*?>/gi, '<br>');
  html = html.replace(/\n[\ ]+/gim, '\n');

  html = html.replace(/<div\s*class=['"']box[x]+['"']>[\s\S]+?<\/div>/gim, '')



  // remove unwanted style suggestion in tags
  html = html.replace(/\s+align="center"/ig, '');

  // replace spacer paragraphs with small hr  <p>&nbsp;</p>
  html = html.replace(/<p>&nbsp;<\/p>/gim, '<hr class="small">');

  // remove br inside p
  html = html.replace(/(<p.*?>)\s*<br>\s*/gim, '$1');
  html = html.replace(/(<p.*?>)\s*/gim, '$1 ');


  // translate nbsp to whitespace for collapsing
  html = html.replace(/&nbsp;/g, ' ');

  // remove TOC
  html = html.replace(/^(\s+)?<h2>\s+Contents\s+<\/h2>[\s\S]+?<hr( \/)?>\s+/im, '');
   // alternative styles
   html = html.replace(/<blockquote>\s+<p\s+class="toc">\s+.*?CONTENTS.*?\s+<\/p>\s+<p>[\s\S]+?<\/p>\s+<\/blockquote>/im, '')
   html = html.replace(/<h2(.*?)?>\s*CONTENTS(\.)?\s*<\/h2>\s+(<br>)?\s*<p>[\s\S]+?<\/p>/im, '');
   html = html.replace(/<h2(.*?)?>\s*ILLUSTRATIONS(\.)?\s+<\/h2>\s+<p>[\s\S]+?<\/p>/im, '');
   html= html.replace(/<H2(.*?)?>\s*CONTENTS(\.)?\s*<\/H2>\s+<TABLE[\s\S]+?<\/TABLE>/gim, '');
   html = html.replace(/<h2(.*?)?>\s*CONTENTS(\.)?\s*<\/h2>/im, '');
     html = html.replace(/<h2(.*?)?>\s*CONTENTS(\.)?\s*<\/h2>/im, '');
     html = html.replace(/<div\s+class=["']toc[\s\S]+?<\/div>/gim, '');
  // remove anchor only links
  html = html.replace(/<a( name=".*?")?>(.*?)<\/a>/gim, '$2');
  // remove copyright blocks (had to remove because .c and .cb were being used generally)
  // html = html.replace(/<p\s+class=["']c[b]?["']>[\s\S]+?<\/p>/gim , '');

  // remove Gutenbert "enlarge image" links
  html = html.replace(/^\s+?<h5>\s+<a href=".*?\s+?src="images\/enlarge.jpg"\s+.*?\s+<\/h5>/gm, '');
  // remove html comments
  html = html.replace(/<!--[\s\S]+?-->/gm, '');
  // remove empty links
  html = html.replace(/<a.*?>\s*<\/a>/g, '');
  html = html.replace(/<a\s*.*?\s*.*?>\s*<\/a>/g, '');
  // when TOC has a semantic class (such as in Moby Dick)
  html = html.replace(/<p class="toc">[\s\S]+?<\/p>/g, '');

  // remove some gutenberg additional sections such as "mynotes" and "extracts"
  html = html.replace(/<div class="(mynote|extracts)">[\s\S]+?<\/div>/g, '');

  // lower case all blocks, just because
  html= html.replace('()<(\/)?(h1|h2|h3|h4|p|pre|title|br|a|b|i|u)( |>))', function(match) {
    return match.toLowerCase();
  });

  // fix common entities
  html = html.replace(/&ldquo;/g, '“').replace(/&rdquo;/g, '”')
    .replace(/&rsquo;/g, '’').replace(/&lsquo;/g, '‘')
    .replace(/&mdash;/g, '—').replace(/—(\s+)?—/g, '—').replace(/(\s+)?—(\s+)?/g, ' — ')
    .replace(/&amp;/g, '&');

  // remove everything except body text
   //html = html.replace(/[\s\S]+<body>([\s\S]+?)<\/body>[\s\S]+/im, '$1');

  // fix two-part headers
  html = html.replace(/<h3.*?>\s+(Chapter [0-9lxcvi]+)\s+<\/h3>\s+<h3.*?>\s+(.*?)\s+<\/h3>/gim, '<h2 class="header">$1. $2</h2>')

  // remove Gutenberg style dropcap
  html = html.replace(/<span class="dropcap" style=".*?">(.*?)<\/span>/gi, '$1');
  // remove Gutenberg empty TOC links
  html = html.replace(/<a .*?>([\s]+)?<\/a>/gmi, '');
  // normalize <br> and remove empty paragraphs
  html = html.replace(/([\s]+)?<br(\ \/)?>([\s]+)?/ig, '<br>').replace(/(<br>)+/ig, '<br>');
  // remove <br> at beginning or end of par
  html = html.replace(/<p>(<br>)+/ig, '<p>').replace(/(<br>)+<\/p>/ig, '</p>');
  // remove empty blocks
  html = html.replace(/<(p|div).*?>([\s]+)?(<br>)?([\s]+)?<\/(p|div)>/gmi, '')
  // remove paragraphs containing a single link (an old TOC link back)
  html = html.replace(/<p>\s?<a.*?><\/a>\s*?<\/p>/gi, '');
  // remove empty blockquotes
  html = html.replace(/<blockquote>[\s]+?<\/blockquote>/ig, '');
  // compress multiple <hr>
  html = html.replace(/<hr>\s*<br>/gim, '<hr>');
  html = html.replace(/<hr>[\s]*<hr>/igm, '<hr>');
  // blockquoted paragraphs

  html = html.replace(/<blockquote>\s+<p>([\s\S]+?)<\/p>\s+<\/blockquote>/igm, '<p class="blockquote">\n     $1\n</p>');

  // oldschool dropcap
  html = html.replace(/<p>\s*<font.*?>([A-Z])<\/font>/img, '<p class="dropcap"> $1');

  // add some space between blocks
  html = html.replace(/(<\/[phd].*?>)/img, '$1\n\n\n');
    html = html.replace(/(<[phd].*?>)/img, '\n\n$1');
    html = html.replace(/\n{3,}/img, '\n\n');

  // identify the author blocks so they are not seen as a header
  html = html.replace(/(<\/h1>\s+)<h2>(\s+by.*?\s+)<\/h2>/im, '$1<h2 class="author">$2</h2>');

  html = html.replace(/^\s+?(<[phd])/img, '\n\n\n<!-- New Block -->\n$1');
  html = html.replace(/^\s+?(<\/[phd])/img, '$1');
  // replace \r\n with whitespace
  html = html.replace(/[\ ]?\r\n/g, ' \n');

  // remove empty paragraphs
  html = html.replace(/<p>[\s]+?<\/p>/g, '');

  // done
  html = html.trim();


  // load with decodeEntities to catch all the entities
  var $ = cheerio.load(html, {decodeEntities: true})

  // loop through all blocks, counting sorting and assigning
  book.content = []
  var block_id = 100
  var unknown = []
  var seccount = 0
  var prevContent = ''
  let parnum = 0
  let secnum = 0

  $("h2, h3, p, .header").each(function(){
    var tag = $(this).prop("tagName").toLowerCase();
    var isHeader = _isHeader($(this).text().trim())
    var isAuthor = $(this).attr('class') && $(this).attr('class').indexOf('author')>-1
    isHeader = (isHeader && !isAuthor)
    if (isHeader) seccount++
  });
  var hasSections = seccount > 1
  //console.log(' '+ seccount + ' sections')

  // loop through all block-level elements (which unfortunately means including 'div' and 'blockquote')
  // maybe we can regex div and blockquote out?
  $("p, h1, h2, h3, h4, h5, hr").each(function(){
    let block = {}
    block.tag = $(this).prop("tagName").toLowerCase()
    block.content = ent.decode($(this).html().trim())
    block.content = _stripTags(block.content).trim() // stips unwelcome html tags
    let hasContent = _stripTags(block.content, []).trim().length>0

    // toss out block if it is the same as previous block
    if (prevContent && prevContent==block.content) return; // skip block
    prevContent = block.content;

    // reject if a wrapper (div or blockquote usually), otherwise make it a par
    if (block.tag == 'div' || block.tag == 'blockquote') {
      // sometimes a div wraps a bunch of other stuff. Ignore these or it will be duplicate
      if (block.content.indexOf('<p')>-1 || block.content.indexOf('<h')>-1) {
        console.log('Rejecting wrapper: ', block.tag, block.content)
        return  // reject wrapper
      }
      if (!hasContent) return // reject empty block
      // else, make it into a par
      if (block.tag == 'blockquote') _addClass(block, 'blockquote')
      block.tag = 'p'
    }

    // increment block id
    block.id = block_id.toString(36);  block_id++;
    // attach any existing Gutenberg block classes:
       // c, cb, fig, figright, figleft, middle, side, pfirst, foot, mynote, indent#
       // noindent, footnote, transnote, finis
    _addClass(block, $(this).attr('class'))

    // here we identify the type of block and any classes needed
    // title|header|subhead|par|note|illustration|hr


    // Gutenberg title seems to be always h1
    if (block.tag == 'h1') {
      if (!hasContent) return // reject empty block
      block.type = 'title';
      block.content = _smartQuotes(block.content)
      block.content = toLaxTitleCase(block.content.toLowerCase())
      block.content = block.content.replace(/\b[lxcvi]+\b/gi, item => item.toUpperCase())
      block.content = block.content.replace(/\.\s*[a-z]/gi, item => item.toUpperCase())
    }

    // illustrations seem to be div.fig
    else if (_hasClass(block, 'fig figleft figright')) {
      _removeClass(block, 'fig figleft figright');
      block.type = 'illustration';
      // for each img, extract tag and
      let rx = /src=['"](.*?)["']/gi;
      block.content = block.content.replace(rx, function(match, url) {
        // fix url if it's not relative
        if (url.indexOf('http')<0) {
          // prefix with book's source url, replacing the book filename
          url = '';//book.meta.sourceUrl.replace(/\/[^\/]*?$/m, '/'+ _.trim(url, '/'));
        }
        var ext = _fileExt(url);
        var mtype = mime.lookup(ext);
        var imgobj = {
          sourceUrl: url,
          type: mtype
        };
        if (!book.files) book.files = [];
        book.files.push(imgobj);
        var rpl = "src='"+book.files.length+'.'+ext+"'";
        return rpl;
      });
      // replace all images with clean pattern, keep alt, src
      block.content = block.content.replace(/<img src=['"](.*?)['"] [^>]*? (alt=['"](.*?)([ ])?['"])?[^>]*?>/ig,
        '<img src="$1" alt="$3">');
    }

    // section headers are usually h2, but sometimes h2
    else if (block.tag == 'h2' || (_isHeader(block.content))) {
      if (!hasContent) return // reject empty block
      //if (block.tag == 'h3') console.log('HEADER: '+block.content+',  '+_secnum(block.content))
      block.type = 'header';
      var num = _secnum(block.content);
      if (num) {
        secnum = num;
        parnum = 0;
        block.secnum = secnum;
      }
      block.content = _smartQuotes(block.content)
      block.content = toLaxTitleCase(block.content.toLowerCase())
      block.content = block.content.replace(/\b[lxcvi]+\b/gi, item => item.toUpperCase())
      block.content = block.content.replace(/\.\s*[a-z]/gi, item => item.toUpperCase())
      block.content = block.content.replace(/\./, '.<br>')
    }

    // for other h3-h5, assume a subhead
    else if (['h3','h4','h5'].indexOf(block.tag)>-1) {
      if (!hasContent) return // reject empty block
      block.type = 'subhead'
      _addClass(block, 'toc2')
      block.content = _smartQuotes(block.content)
      block.content = toLaxTitleCase(block.content.toLowerCase())
      block.content = block.content.replace(/\b[lxcvi]+\b/gi, item => item.toUpperCase())
      block.content = block.content.replace(/\.\s*[a-z]/gi, item => item.toUpperCase())
      block.content = block.content.replace(/\./, '.<br>')
    }

    // default hr is hr.small
    else if (block.tag == 'hr') {
      // reject if no content in book so far
      if (book.content.length<1) return;
      block.type = 'hr'
      _addClass(block, 'small')
    }

    // footnotes (may need manually moved to paragraph)
    else if (_hasClass(block, 'foot footnote transnote'))  {
      if (!hasContent) return // reject empty block
      block.type = 'note'
      _removeClass(block, 'foot footnote transnote')
      block.content = _smartQuotes(block.content)
    }

    // regular par (including verse and dropcap) gets a number
    else if (block.tag == 'p' || block.tag == 'pre' || _hasClass(block, 'poem pfirst dropcap noindent')) {
      if (!hasContent) return // reject empty block
      block.type = 'par'
      if (_hasClass(block, 'pfirst')) _addClass(block, 'dropcap')
      if (_hasClass(block, 'poem')) _addClass(block, 'verse')
      if (_hasClass(block, 'noindent')) _addClass(block, 'sitalcent')
      if ((secnum || !hasSections) && !_hasClass(block, 'noindent')) {
        parnum++
        if (hasSections) block.parnum = secnum+'.'+parnum
         else block.parnum = parnum
        if (parnum==1 && block.content[0].match(/[A-Z]/) && block.content.length>250) _addClass(block, 'dropcap')
          else _removeClass(block, 'dropcap')
      }

      block.content = _smartQuotes(block.content)
      if (block.tag == 'pre') _addClass(block, 'pre blockquote')
      if (_hasClass(block, 'c cb mynote')) _addClass(block, 'italic')
      _removeClass(block, 'c cb pfirst poem noindent mynote')
    }

    else {
      if (!hasContent) return // reject empty block
      block.type = 'unknown';
    }

    if (block.type != 'hr') _addClass(block, block.type);
    book.content.push(block);
  });



  // log these for testing
  fs.writeFile(__dirname + '/test/testbook_cleaned.html', $.html({ decodeEntities: false }));
  //fs.writeFile(__dirname + '/test/testbook.json', JSON.stringify(book, null, 2));
  fs.writeFile(__dirname + '/test/unknown_blocks.json', JSON.stringify(unknown, null, 2));
}
