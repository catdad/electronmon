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

To use it, you don't have to change your application at all. Just use `electronmon` instead of `electron` to launch your application, using all the same arguments you would pass to the `electron` cli:

```bash
npx electronmon .
```

That's it! Now, all your files are watched. Changes to main process files will cause the application to restart entirely, while changes to any of the renderer process files will simply reload the application browser windows.

All you have to do now is write your application code.

## Supported environments

This module is tested and supported on Windows, MacOS, and Linux, using node versions 8, 10, and 12 and electron versions 3, 4, 5, 6, and 7.

## API Usage

You will likely never need to use this, but in case you do, this module can be required and exposes and API for interacting with the monitor process.

```javascript
const electronmon = require('electronmon');

(async () => {
  const options = {...};
  const app = await electronmon(options);
})();
```

All options are optional with reasonable defaults (_again, magic_ 🧙), but the following options are available:

* **cwd** _{String}_ - The root directory of your application
* **args** _{Array}_ - The arguments that you want to pass to `electron`
* **env** _{Object}_ - Any additional environment variables you would like to specically provide to your `electron` process
* **logLevel** _{String}_ - The level of logging you would like. Possible values are `verbose`, `info`, ` error`, and `quiet`
* **electronPath** _{String}_ - The path to the `electron` binary.

When the monitor is started, it will start your application and the monitoring process. It exposes the following methods for interacting with the monitoring process (all methods are asynchronous and return a Promise):

* **`app.reload()`** → `Promise` - reloads all open web views of your application
* **`app.restart()`** → `Promise` - restarts the entire electron process of your application
* **`app.close()`** → `Promise` - closes the entire electron process of your application and waits for file changes in order to restart it
* **`app.destroy()`** → `Promise` - closes the entire electron process and stops monitoring
