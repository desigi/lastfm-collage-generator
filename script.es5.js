'use strict';

var canvas = void 0,
  c = void 0;
var downloaded = 0;
var collageInfo = {};
var METHOD_ALBUMS = 1;
var METHOD_ARTISTS = 2;

var TIMEFRAME_TOO_SMALL = 4;
var TIMEFRAME_TOO_SMALL_SPARSE = 3;
var PERFECT = 2;
var RETRY = 1;

$(function() {
  $('#copyright').css('display', 'block').html('Copyright &copy; deSigi  ' + new Date().getFullYear());
  $('#form').submit(function(e) {
    e.preventDefault();
    localStorage.username = $('#username').val().trim();
    localStorage.period = $('#period').find(':selected').val();
    localStorage.rows = $('#rows').find(':selected').val();
    localStorage.cols = $('#cols').find(':selected').val();
    localStorage.size = $('#size').find(':selected').val();
    localStorage.method = $('#method').find(':selected').val();
    localStorage.showName = $('#showName').is(':checked');
    localStorage.hideMissingArtwork = $('#hideMissing').is(':checked');
    submit();
  });
  $('#method').change(function(e) {
    setOverlayLabel();
  });
  canvas = document.getElementById('canvas');
  c = canvas.getContext('2d');
  setFieldsFromLocalStorage();
});

function setFieldsFromLocalStorage() {
  setFieldFromLocalStorage('username');
  setFieldFromLocalStorage('period');
  setFieldFromLocalStorage('rows');
  setFieldFromLocalStorage('cols');
  setFieldFromLocalStorage('size');
  setFieldFromLocalStorage('method');
  $('#showName').prop('checked', localStorage.showName === 'true');
  $('#hideMissing').prop('checked', localStorage.hideMissingArtwork === 'true');
  setOverlayLabel();
}

function setFieldFromLocalStorage(id) {
  if (localStorage[id]) {
    $('#' + id).val(localStorage[id]);
  }
}

function setOverlayLabel() {
  if (parseInt($('#method').find(':selected').val()) === METHOD_ALBUMS) {
    $('#showNameLabel').html('Overlay album name');
  } else {
    $('#showNameLabel').html('Overlay artist name');
  }
}

function submit() {
  downloaded = 0;

  setCollageInfo();
  initCanvas();

  getImageLinks();
}

function setCollageInfo() {
  collageInfo.showName = localStorage.showName === 'true';
  collageInfo.hideMissingArtwork = localStorage.hideMissingArtwork === 'true';
  collageInfo.method = parseInt(localStorage.method);
  collageInfo.size = parseInt(localStorage.size);
  collageInfo.rows = parseInt(localStorage.rows);
  collageInfo.cols = parseInt(localStorage.cols);

  collageInfo.imageNum = collageInfo.rows * collageInfo.cols;

  switch (collageInfo.size) {
    case 0:
      collageInfo.sideLength = 34;
      break;
    case 1:
      collageInfo.sideLength = 64;
      break;
    case 2:
      collageInfo.sideLength = 174;
      break;
    default:
      collageInfo.sideLength = 300;
      break;
  }
}

function initCanvas() {
  $('#canvasImg').remove();
  $('#canvas').css('display', 'inline');
  $('#loading').css('display', 'block');

  canvas.width = collageInfo.sideLength * collageInfo.cols;
  canvas.height = collageInfo.sideLength * collageInfo.rows;

  c.fillStyle = 'black';
  c.fillRect(0, 0, canvas.width, canvas.height);
}

function getImageLinks() {
  // Last.fm specific
  var username = localStorage.username;
  var period = localStorage.period;
  var API_KEY = '89d4990b2a8eee5253200b2cb2d67a21';
  var limit = collageInfo.rows * collageInfo.cols;
  var currentLimit = limit;

  var setUrlFromLimit = function setUrlFromLimit() {
    switch (collageInfo.method) {
      case METHOD_ALBUMS:
        collageInfo.url = 'http://ws.audioscrobbler.com/2.0/?method=user.gettopalbums&user=' + username + '&period=' + period + '&api_key=' + API_KEY + '&limit=' + currentLimit + '&format=json';
        break;
      case METHOD_ARTISTS:
        collageInfo.url = 'http://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=' + username + '&period=' + period + '&api_key=' + API_KEY + '&limit=' + currentLimit + '&format=json';
        break;
    }
  };

  var callApi = function callApi() {
    setUrlFromLimit();
    axios.defaults.headers.post['Content-Type'] ='application/x-www-form-urlencoded';
    axios.defaults.headers.post['Access-Control-Allow-Origin'] = '*';
    axios.get(collageInfo.url).then(function(_ref) {
      var data = _ref.data;

      console.log(data);
      if (collageInfo.hideMissingArtwork) {
        var artworkStatus = verifyEnoughArtwork(data);
        if (artworkStatus.retryCode !== RETRY) {
          var links = artworkStatus.links,
            titles = artworkStatus.titles,
            artists =artworkStatus.artists;

          makeCollage(links, titles, artists);
        } else {
          console.log('Missing ' + artworkStatus.missing + ' images. Retrying with increased limit...');
          currentLimit += artworkStatus.missing;
          callApi();
        }
      } else {
        var _links = collageInfo.method === METHOD_ALBUMS ? data.topalbums.album.map(function(_ref2) {
          var image = _ref2.image;
          return image[collageInfo.size]['#text'];
        }) : data.topartists.artist.map(function(_ref3) {
          var image = _ref3.image;
          return image[collageInfo.size]['#text'];
        });
        var _titles = collageInfo.method === METHOD_ALBUMS ? data.topalbums.album.map(function(_ref4) {
          var albumname = _ref4.name;
          return albumname;
        }) : data.topartists.artist.map(function(_ref5) {
          var name = _ref5.name;
          return name;
        });
        var _artists = collageInfo.method === METHOD_ALBUMS ? data.topalbums.album.map(function(_ref4) {
          var artist = _ref4.artist;
          return artist.name;
        }) : data.topartists.artist.map(function(_ref5) {
          var artistname = _ref5.name;
          return artistname;
        });
        makeCollage(_links, _titles, _artists);
      }
    }).catch(function(error) {
      console.log(error);
      alert('There was an error');
    });
  };
  // End Last.fm specific

  var verifyEnoughArtwork = function verifyEnoughArtwork(data) {
    var artworkStatus = {};
    var allLinksAndTitles = [];

    if (collageInfo.method === METHOD_ALBUMS) {
      for (var i = 0; i < data.topalbums.album.length; i++) {
        allLinksAndTitles[i] = {
          link: data.topalbums.album[i].image[collageInfo.size]['#text'],
          title: data.topalbums.album[i].name,
          artist: data.topalbums.album[i].artist.name
        };
      }
    } else {
      for (var _i = 0; _i < data.topartists.artist.length; _i++) {
        allLinksAndTitles[_i] = {
          link: data.topartists.artist[_i].image[collageInfo.size]['#text'],
          title: data.topartists.artist[_i].name
        };
      }
    }

    var validLinksAndTitles = allLinksAndTitles.filter(function(_ref6) {
      var link = _ref6.link;
      return link && link.length > 0;
    });

    var missingLinksAndTitles = allLinksAndTitles.filter(function(_ref7) {
      var link = _ref7.link;
      return !(link && link.length > 0);
    });
    console.log('missing', missingLinksAndTitles.length);
    console.log('valid', validLinksAndTitles.length);

    artworkStatus.links = validLinksAndTitles.map(function(_ref8) {
      var link = _ref8.link;
      return link;
    });
    artworkStatus.titles = validLinksAndTitles.map(function(_ref9) {
      var title = _ref9.title;
      return title;
    });
    artworkStatus.artists = validLinksAndTitles.map(function(_ref9) {
      var artist = _ref9.artist;
      return artist;
    });

    artworkStatus.missing = allLinksAndTitles.length - validLinksAndTitles.length;
    if (allLinksAndTitles.length < limit) {
      // timeframe doesn't have enough entries
      if (artworkStatus.missing === 0) {
        // all entries have artwork
        artworkStatus.retryCode = TIMEFRAME_TOO_SMALL;
      } else {
        // not all entries have artwork
        artworkStatus.retryCode = TIMEFRAME_TOO_SMALL_SPARSE;
      }
    } else {
      if (validLinksAndTitles.length >= limit) {
        // perfect scenario
        artworkStatus.retryCode = PERFECT;
      } else {
        // retry
        artworkStatus.retryCode = RETRY;
      }
    }
    return artworkStatus;
  };

  callApi();
}

function makeCollage(links, titles, artists) {
  for (var i = 0, k = 0; i < collageInfo.rows; i++) {
    for (var j = 0; j < collageInfo.cols; j++, k++) {
      if (!links[k] || links[k].length === 0) {
        if (!titles[k] || titles[k].length === 0) {
          // not enough images, we are settling for blank bottom corner
          registerDownloaded();
        } else {
          loadImage(null, j, i, titles[k], artists[k], true);
        }
      } else {
        loadImage(links[k], j, i, titles[k], artists[k], collageInfo.showName);
      }
    }
  }
}

function loadImage(link, i, j, title, artist, showName) {
  console.log(link, i, j, title, artist, showName);
  if (!link) {
    printName(i, j, title, artist);
    registerDownloaded();
  } else {
    var img = new Image(collageInfo.sideLength, collageInfo.sideLength);
    img.crossOrigin = 'Anonymous';
    img.classList.add('img-responsive');
    img.onload = function() {
      c.drawImage(img, i * collageInfo.sideLength, j * collageInfo.sideLength);
      if (showName && title && title.length > 0) {
        printName(i, j, title, artist, true);
      }
      registerDownloaded();
    };
    img.src = link;
  }
}

function printName(i, j, title, artist) {
  var overlay = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;

  c.textAlign = 'left';
  var fontSize = 0.04 * collageInfo.sideLength;
  console.log("font size", fontSize);
  c.font = fontSize + 'pt sans-serif';
  c.fillStyle = 'white';
  var textX = i * collageInfo.sideLength + collageInfo.sideLength * 0.01;
  var textY = void 0;
  var textY2 = void 0;
  c.save();
  if (overlay) {
    c.shadowBlur = 5;
    c.shadowColor = '#000000';
    c.shadowOffsetX = 2;
    c.shadowOffsetY = 2;
    c.textBaseline = 'top';
    textY = j * collageInfo.sideLength + collageInfo.sideLength * 0.01;
    textY2 = j * collageInfo.sideLength + fontSize + (collageInfo.sideLength * 0.015);
  } else {
    textY = j * collageInfo.sideLength + collageInfo.sideLength * 0.01;
    textY2 = j * collageInfo.sideLength + fontSize + (collageInfo.sideLength * 0.015);
    c.textBaseline = 'top';
  }
  c.fillText(artist, textX, textY);
  c.fillText(title, textX, textY2);
  c.restore();
}

function registerDownloaded() {
  downloaded++;
  if (downloaded === collageInfo.imageNum) {
    $('#loading').css('display', 'none');
    $('#canvas').css('display', 'none');
    var canvasImg = new Image(collageInfo.sideLength * collageInfo.cols, collageInfo.sideLength * collageInfo.rows);
    canvasImg.src = canvas.toDataURL('image/png');
    canvasImg.classList.add('img-responsive');
    canvasImg.crossOrigin = 'Anonymous';
    canvasImg.style = 'margin: 10px auto;';
    canvasImg.id = 'canvasImg';
    $('#generated').append(canvasImg);
  }
}