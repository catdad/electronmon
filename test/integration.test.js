const path = require('path');
const fs = require('fs-extra');
const { PassThrough } = require('stream');
const { spawn } = require('child_process');
const ns = require('node-stream');
const unstyle = require('unstyle');
const symlink = require('symlink-dir');
const { expect } = require('chai');

describe('integration', () => {
  let stdout;

  const touch = async file => {
    const content = await fs.readFile(file);
    await fs.writeFile(file, content);
  };

  const wrap = stream => {
    return stream
      .pipe(unstyle())
      .pipe(ns.split())
      .pipe(ns.map(s => s.trim()));
  };

  const collect = stream => {
    const lines = [];

    stream._getLines = () => [].concat(lines);
    stream.on('data', line => lines.push(line));
    stream.pause();

    // make it availabel for afterEach on failed tests
    stdout = stream;

    return stream;
  };

  const waitFor = (stream, regex) => {
    const err = new Error(`did not find ${regex.toString()}`);

    return new Promise((resolve, reject) => {
      const onReadable = () => {
        stream.resume();
      };

      const timer = setTimeout(() => {
        stream.pause();
        stream.removeListener('readable', onReadable);
        stream.removeListener('data', onLine);
        reject(err);
      }, 5000);

      const onLine = line => {
        stream.pause();

        if (regex.test(line)) {
          clearTimeout(timer);
          stream.removeListener('readable', onReadable);
          stream.removeListener('data', onLine);
          return resolve();
        }

        stream.resume();
      };

      stream.on('readable', onReadable);
      stream.on('data', onLine);
      stream.resume();
    });
  };

  const ready = (stream, { main = true, renderer = true, index = true } = {}) => {
    return Promise.all([
      waitFor(stream, /main window open/),
      main ? waitFor(stream, /watching new file: main\.js/) : Promise.resolve(),
      renderer ? waitFor(stream, /watching new file: renderer\.js/) : Promise.resolve(),
      index ? waitFor(stream, /watching new file: index\.html/) : Promise.resolve()
    ]);
  };

  const createCopy = async () => {
    const root = path.resolve(__dirname, '../fixtures');
    const copyDir = path.resolve(__dirname, '..', `test-dir-${Math.random().toString(36).slice(2)}`);

    await fs.ensureDir(copyDir);
    await fs.copy(root, copyDir);

    return copyDir;
  };

  function runIntegrationTests(realRoot, cwd, start, file) {
    it('watches files for restarts or refreshes', async () => {
      const app = await start({
        args: ['main.js'],
        cwd,
        env: Object.assign({}, process.env, {
          ELECTRONMON_LOGLEVEL: 'verbose'
        })
      });

      const stdout = collect(wrap(app.stdout));

      await ready(stdout);

      await Promise.all([
        waitFor(stdout, /renderer file change: index\.html/),
        touch(file('index.html'))
      ]);

      await Promise.all([
        waitFor(stdout, /renderer file change: renderer\.js/),
        touch(file('renderer.js'))
      ]);

      await Promise.all([
        waitFor(stdout, /main file change: main\.js/),
        waitFor(stdout, /restarting app due to file change/),
        waitFor(stdout, /main window open/),
        touch(file('main.js'))
      ]);
    });

    if (process.platform === 'win32') {
      it('restarts apps on a change after they crash and the dialog is still open', async () => {
        const app = await start({
          args: ['main.js'],
          cwd,
          env: Object.assign({}, process.env, {
            ELECTRONMON_LOGLEVEL: 'verbose',
            TEST_ERROR: 'pineapples'
          })
        });

        const stdout = collect(wrap(app.stdout));

        await waitFor(stdout, /pineapples/);
        await waitFor(stdout, /waiting for any change to restart the app/);

        await Promise.all([
          waitFor(stdout, /file change: main\.js/),
          waitFor(stdout, /pineapples/),
          waitFor(stdout, /waiting for any change to restart the app/),
          touch(file('main.js'))
        ]);

        await Promise.all([
          waitFor(stdout, /file change: renderer\.js/),
          waitFor(stdout, /pineapples/),
          waitFor(stdout, /waiting for any change to restart the app/),
          touch(file('renderer.js'))
        ]);
      });
    } else {
      it('restarts apps on a change after they crash at startup', async () => {
        const app = await start({
          args: ['main.js'],
          cwd,
          env: Object.assign({}, process.env, {
            ELECTRONMON_LOGLEVEL: 'verbose',
            TEST_ERROR: 'pineapples'
          })
        });

        const stdout = collect(wrap(app.stdout));

        await waitFor(stdout, /uncaught exception occured/),
        await waitFor(stdout, /waiting for any change to restart the app/);

        await Promise.all([
          waitFor(stdout, /file change: main\.js/),
          waitFor(stdout, /uncaught exception occured/),
          waitFor(stdout, /waiting for any change to restart the app/),
          touch(file('main.js'))
        ]);

        await Promise.all([
          waitFor(stdout, /file change: renderer\.js/),
          waitFor(stdout, /uncaught exception occured/),
          waitFor(stdout, /waiting for any change to restart the app/),
          touch(file('renderer.js'))
        ]);
      });
    }
  }

  function runIntegrationSuite(start) {
    const root = path.resolve(__dirname, '../fixtures');

    const file = fixturename => {
      return path.resolve(root, fixturename);
    };

    describe('when running the app from project directory', () => {
      runIntegrationTests(root, root, start, file);
    });

    describe('when running the app from a linked directory', () => {
      const linkDir = path.resolve(__dirname, '..', `test-dir-${Math.random().toString(36).slice(2)}`);

      before(async () => {
        await symlink(root, linkDir);
      });
      after(async () => {
        await fs.unlink(linkDir);
      });

      it(`making sure link exists at ${linkDir}`, async () => {
        const realPath = await fs.realpath(linkDir);
        expect(realPath).to.equal(root);
      });

      runIntegrationTests(root, linkDir, start, file);
    });

    describe('when providing watch patterns', () => {
      let dir;

      const fileLocal = fixturename => {
        return path.resolve(dir, fixturename);
      };

      before(async () => {
        dir = await createCopy();
      });
      after(async function () {
        // this can take a bit of time because the folder remains locked
        // for a little while (usually round 15 seconds)
        this.timeout(45000);
        let remainingMilliseconds = 30 * 1000;
        const end = Date.now() + remainingMilliseconds;

        while (remainingMilliseconds > 0) {
          try {
            await fs.remove(dir);
            remainingMilliseconds = 0;
          } catch (e) {
            remainingMilliseconds = end - Date.now();
            if (e.code !== 'EBUSY' && remainingMilliseconds > 0) {
              throw e;
            }
          }
        }
      });

      it('ignores files defined by negative patterns', async () => {
        const app = await start({
          args: ['main.js'],
          cwd: dir,
          env: Object.assign({}, process.env, {
            ELECTRONMON_LOGLEVEL: 'verbose'
          }),
          patterns: ['!main-error.js', '!*.html']
        });

        const stdout = collect(wrap(app.stdout));

        await ready(stdout, { index: false });

        await Promise.all([
          waitFor(stdout, /renderer file change: renderer\.js/),
          touch(fileLocal('renderer.js'))
        ]);

        const linesBefore = [].concat(stdout._getLines());
        await touch(fileLocal('index.html'));
        const linesAfter = [].concat(stdout._getLines());

        expect(linesAfter).to.deep.equal(linesBefore);

        await Promise.all([
          waitFor(stdout, /main file change: main\.js/),
          waitFor(stdout, /restarting app due to file change/),
          waitFor(stdout, /main window open/),
          touch(fileLocal('main-error.js')),
          touch(fileLocal('main.js'))
        ]);

        const mainErrorChanged = stdout._getLines().find(line => !!line.match(/main file change: main-error\.js/));

        expect(mainErrorChanged).to.equal(undefined);
      });
    });
  }

  afterEach(function () {
    if (this.currentTest.state === 'failed' && stdout) {
      // eslint-disable-next-line no-console
      console.log(stdout._getLines());
    }

    stdout = null;
  });

  describe('api', () => {
    const api = require('../');
    let app;

    afterEach(async () => {
      if (!app) {
        return;
      }

      await app.destroy();
      app = null;
    });

    const start = async ({ args, cwd, env, patterns = [] }) => {
      const pass = new PassThrough();
      app = await api({
        // NOTE: the API should always use realPath
        cwd: await fs.realpath(cwd),
        args,
        env,
        stdio: [process.stdin, pass, pass],
        logLevel: env.ELECTRONMON_LOGLEVEL || 'verbose',
        patterns
      });

      app.stdout = pass;

      return app;
    };

    runIntegrationSuite(start);

    describe('using api methods', () => {
      const cwd = path.resolve(__dirname, '../fixtures');

      const startReady = async () => {
        app = await start({
          args: ['main.js'],
          cwd,
          env: Object.assign({}, process.env, {
            ELECTRONMON_LOGLEVEL: 'verbose'
          })
        });

        const stdout = collect(wrap(app.stdout));

        await ready(stdout);

        return { app, stdout };
      };

      it('can manually restart an app', async () => {
        const { app, stdout } = await startReady();

        await Promise.all([
          waitFor(stdout, /app exited/),
          waitFor(stdout, /main window open/),
          app.restart()
        ]);
      });

      it('can restart an app after it is stopped', async () => {
        const { app, stdout } = await startReady();

        await Promise.all([
          waitFor(stdout, /app exited/),
          app.close()
        ]);

        await Promise.all([
          waitFor(stdout, /main window open/),
          app.restart()
        ]);
      });

      it('can restart an app after it is destroyed', async () => {
        const { app, stdout } = await startReady();

        await Promise.all([
          waitFor(stdout, /app exited/),
          app.destroy()
        ]);

        await Promise.all([
          ready(stdout),
          app.restart()
        ]);
      });
    });
  });

  describe('cli', () => {
    const cli = path.resolve(__dirname, '../bin/cli.js');
    let app;

    afterEach(async () => {
      if (!app) {
        return;
      }

      const tmp = app;
      app = null;

      await new Promise(resolve => {
        tmp.once('exit', () => resolve());

        // destroying the io is necessary on linux and osx
        tmp.stdout.destroy();
        tmp.stderr.destroy();

        tmp.kill();
      });
    });

    const start = async ({ args, cwd, env, patterns }) => {
      if (patterns && patterns.length) {
        const pkgPath = path.resolve(cwd, 'package.json');
        const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf8'));
        pkg.electronmon = { patterns };
        await fs.writeFile(pkgPath, JSON.stringify(pkg));
      }

      app = spawn(process.execPath, [cli].concat(args), {
        env,
        cwd,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      return app;
    };

    runIntegrationSuite(start);
  });
});
