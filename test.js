const { spawnSync } = require('child_process');

const spawn = require('child_process').spawn;

const exePath = "D:/Spel/Programming/C++/ÖPlusPlus/Debug/ÖPlusPlus.exe";
const exeDirectory = "D:/Spel/Programming/C++/ÖPlusPlus/Debug";
const exeFilename = "ÖPlusPlus.exe";

let cmd  = spawn(`.\\${exeFilename}`, ["-ast", "-fc", "\"print(\"1\n\");\""], { cwd: exeDirectory});

console.log(cmd)

cmd.stdout.setEncoding("utf-8");
cmd.stderr.setEncoding("utf-8");

let counter = 0;
cmd.stdout.on('data', function(data) {
	counter ++;
	console.log('stdout: ', data);
});

cmd.stderr.on('data', function(data) {
	console.log('stderr: ' + data);
});

cmd.on('close', function(code) {
	console.log('exit code: ' + code);
	console.log(counter);
});