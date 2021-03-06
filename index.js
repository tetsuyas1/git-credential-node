const cp = require('child_process');
const spawnSync = cp.spawnSync;
const execFile = cp.execFile;

const credentialRE = /username=([^\n]+)\npassword=([^\n]+)\n/;

function parse(result) {
  const match = result.match(credentialRE);
  if (!match) {
    return null;
  }
  const username = match[1];
  const password = match[2];

  return { username, password };
}

function runSync(command, opts) {
  const result = spawnSync('git', ['credential', command], opts);
  if (result.error) {
    throw result.error;
  }
  if (result.stderr) {
    throw new Error(result.stderr);
  }
  return result.stdout;
}


function runAsync(command, opts, cb) {
  const proc = execFile('git', ['credential', command], opts, (err, stdout, stderr) => {
    if (err) {
      return cb(err);
    }
    if (stderr) {
      return cb(new Error(stderr));
    }

    cb(null, stdout);
  });

  if (opts.input) {
    proc.stdin.write(opts.input);
  }
}

function fillOpts(url) {
  return {
    encoding: 'utf8',
    input: url ? `url=${url}\n\n` : '\n',
    env: Object.assign({GIT_TERMINAL_PROMPT: '0'}, process.env)
  };
}

exports.fillSync = function fillSync(url) {
  try {
    const result = runSync('fill', fillOpts(url));
    return parse(result);
  } catch (err) {
    if (err.message.includes('terminal prompts disabled')) {
      return null;
    }
    throw err;
  }
};

exports.fill = function fill(url, cb) {
  return new Promise( (resolve, rej) => {
    runAsync('fill', fillOpts(url), (err, result) => {

      if (err) {
        if (err.message.includes('terminal prompts disabled')) {
          if (cb) {
            cb(null, null);
          }
          return resolve(null);
        }

        if (cb) {
          cb(err);
        }
        return rej(err);
      }
      const ret = parse(result);
      resolve(ret);
      if (cb) {
        cb(null, ret);
      }
    });
  });
};

function rejectOpts(url) {
  return {
    encoding: 'utf8',
    input: url ? `url=${url}\n\n` : '\n'
  };
}

exports.rejectSync = function rejectSync(url) {
  runSync('reject', rejectOpts(url));
};

exports.reject = function reject(url, cb) {
  return new Promise( (resolve, rej) => {
    runAsync('reject', rejectOpts(url), err => {
      if (err) {
        if (cb) {
          cb(err);
        }
        return rej(err);
      }
      resolve(null);
      if (cb) {
        cb(null, null);
      }
    });
  });
};

function approveOpts(args) {
  const username = args.username;
  const password = args.password;
  const url = args.url;

  return {
    encoding: 'utf8',
    input: (url ? `url=${url}\n` : '') +
      `username=${username}\npassword=${password}\n\n`
  };
}

exports.approveSync = function approveSync(args) {
  const username = args.username;
  const password = args.password;
  const url = args.url;
  runSync('approve', approveOpts({ username, password, url }));
};


exports.approve = function approve(args, cb) {
  const username = args.username;
  const password = args.password;
  const url = args.url;
  return new Promise( (resolve, rej) => {
    runAsync('approve', approveOpts({ username, password, url }), err => {
      if (err) {
        if (cb) {
          cb(err);
        }
        return rej(err);
      }
      resolve(null);
      if (cb) {
        cb(null, null);
      }
    });
  });
};

