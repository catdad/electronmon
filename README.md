# electronmon

Watch and reload your electron app the easy way!

[![travis][travis.svg]][travis.link]
[![appveyor][appveyor.svg]][appveyor.link]
[![npm-downloads][npm-downloads.svg]][npm.link]
[![npm-version][npm-version.svg]][npm.link]
[![dm-david][dm-david.svg]][dm-david.link]

[travis.svg]: https://travis-ci.com/catdad/electronmon.svg?branch=master
[travis.link]: https://travis-ci.com/catdad/electronmon
[appveyor.svg]: https://ci.appveyor.com/api/projects/status/github/catdad/electronmon?branch=master&svg=true
[appveyor.link]: https://ci.appveyor.com/project/catdad/electronmon
[npm-downloads.svg]: https://img.shields.io/npm/dm/electronmon.svg
[npm.link]: https://www.npmjs.com/package/electronmon
[npm-version.svg]: https://img.shields.io/npm/v/electronmon.svg
[dm-david.svg]: https://david-dm.org/catdad/electronmon.svg
[dm-david.link]: https://david-dm.org/catdad/electronmon

This is the simplest way to watch and restart/reload [electron](https://github.com/electron/electron) applications. It requires no quessing, no configuration, and no changing your application or conditionally requiring dependencies. And best of all, it keeps everything in-process, and will not exit on the first application relaunch.

It was inspired by [nodemon](https://github.com/remy/nodemon) and largely works the same way (_by magic_ 🧙).

To use it, you don't have to change your application at all. Just use `electronmon` to launch it, using all the same arguments you would pass to the `electron` cli:

```bash
npx electronmon .
```

That's it! Now, all your files are watched. Changes to main process files will cause the application to restart entirely, while changes to any of the renderer process files will simply reload the application browser windows.

All you have to do now is write your application code.
