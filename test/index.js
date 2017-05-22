var  importGutenbergHtml = require("../index.js").importGutenbergHtml
//var  searchGutenbergHtml = require("../index.js").searchGutenbergHtml,
//var  uploadZipBook = require("../index.js").uploadZipBook,
var  chai = require("chai");
     chai.use(require("chai-as-promised")); // for use with promises



var TESTBOOKS = [
  {file: 'metamorphosis-5200-h.htm', title:'Metamorphosis', author:'Franz Kafka', lang: 'en'},
  {file: 'burroughs-tarzan.html', title:'Tarzan of the Apes', author:'Edgar Rice Burroughs', lang: 'en'},
  {file: 'hucklberry-finn-76-h.htm', title:'Adventures of Huckleberry Finn', author:'Mark Twain', lang: 'en'},
  {file: 'alice-in-wonderland-11-h.htm', title:"Alice’s Adventures in Wonderland", author:'Lewis Carroll', lang: 'en'},
  {file: 'moby-dick-2701-h.htm', title:'Moby Dick', author:'Herman Melville', lang: 'en'},
  {file: 'dolls-house-2542-h.htm', title:"A Doll’s House", author:'Henrik Ibsen', lang: 'en'},
  {file: 'pride-and-predjudice-1342-h.htm', title:'Pride and Prejudice', author:'Jane Austen', lang: 'en'},
  {file: 'dorian-gray-174-h.htm', title:'The Picture of Dorian Gray', author:'Oscar Wilde', lang: 'en'},
  {file: 'sherlock-holmes-1661-h.htm', title:'The Adventures of Sherlock Holmes', author:'Arthur Conan Doyle', lang: 'en'},
  {file: 'dracula-345-h.htm', title:'Dracula', author:'Bram Stoker', lang: 'en'},
  {file: 'tale-two-cities-98.html', title:'A Tale of Two Cities', author:'Charles Dickens', lang: 'en'},
  {file: 'emma-158-h.htm', title:'Emma', author:'Jane Austen', lang: 'en'},
  {file: 'tom-sawyer-74-h.htm', title:'The Adventures of Tom Sawyer', author:'Mark Twain', lang: 'en'},
  {file: 'frankenstein-84.html', title:'Frankenstein', author:'Mary Wollstonecraft Shelley', lang: 'en'},
  {file: 'great-expectations-1400-h.htm', title:'Great Expectations', author:'Charles Dickens', lang: 'en'},
  {file: 'yellow-wallpaper-1952-h.htm', title:'The Yellow Wallpaper', author:'Charlotte Perkins Gilman', lang: 'en'}
]

// Todo:
//  Metamorphosis:
//    * \r\n needs to be replaced with return
//    * straight quotes to smart quotes
//  Huckleberry Finn
//    * remove part of name in parenthesis
//    * Strip backlinks out of headers like <a href=\"#c1\">CHAPTER I.</a>
//    *


describe("ILM Book Import Tests", function() {
  it("Let me import Gutenberg books", function() {
    this.timeout(10000);
    var booksDir = __dirname +"/gutenbooks/"
    var tmpDir =__dirname +"/imports/"
    var tests = []
    TESTBOOKS.forEach(function(book){
      var bookfile = booksDir + book.file
      var prom = importGutenbergHtml(bookfile, tmpDir);
      tests.push(
        Promise.all([
          chai.expect(prom).to.eventually.have.deep.property('meta.author', book.author),
          chai.expect(prom).to.eventually.have.deep.property('meta.title', book.title),
          chai.expect(prom).to.eventually.have.deep.property('meta.lang', book.lang),
          //chai.expect(prom).to.eventually.have.deep.property('meta.bookid', 'dumas-count_monte_cristo-en'),
          chai.expect(prom).to.eventually.have.property('content'),
        ])
      )
    })
    return Promise.all(tests)



    // this.timeout(60000);
    // var tmpDir = __dirname +"/import";
    // var testBookURL = 'https://www.gutenberg.org/files/1184/1184-h/1184-h.htm';
    //   // http://www.gutenberg.org/ebooks/1184
    // //var testBook =  __dirname +'/testbook.html';
    // var prom = importGutenbergHtml(testBookURL, tmpDir);
    // // return expect(prom).to.eventually.equal(true);
    // return Promise.all([
    //   chai.expect(prom).to.eventually.have.deep.property('meta.author', 'Alexandre Dumas'),
    //   chai.expect(prom).to.eventually.have.deep.property('meta.title', 'The Count of Monte Cristo'),
    //   chai.expect(prom).to.eventually.have.deep.property('meta.lang', 'en'),
    //   chai.expect(prom).to.eventually.have.deep.property('meta.bookid', 'dumas-count_monte_cristo-en'),
    //   chai.expect(prom).to.eventually.have.property('content'),
    // ]);


    // var tmpDir = __dirname +"/import";
    // var tmpZip = __dirname + "/14975-h.zip";
    // var prom = uploadZipBook(tmpZip);
    // return chai.expect(prom).to.eventually.equal(true);
  });
});
