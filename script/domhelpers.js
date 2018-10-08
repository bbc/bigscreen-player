define(
  'bigscreenplayer/domhelpers',
  function () {
    var addClass = function (el, className) {
      if (el.classList) {
        el.classList.add(className);
      } else {
        el.className += ' ' + className;
      }
    };

    var removeClass = function (el, className) {
      if (el.classList) {
        el.classList.remove(className);
      } else {
        el.className = el.className.replace(new RegExp('(^|\\b)' + className.split(' ').join('|') + '(\\b|$)', 'gi'), ' ');
      }
    };

    var hasClass = function (el, className) {
      if (el.classList) {
        return el.classList.contains(className);
      } else {
        return new RegExp('(^| )' + className + '( |$)', 'gi').test(el.className);
      }
    };

    return {
      addClass: addClass,
      removeClass: removeClass,
      hasClass: hasClass
    };
  }
);
