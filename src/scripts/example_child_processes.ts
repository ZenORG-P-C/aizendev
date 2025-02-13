import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

interface CommandResult {
  command: string;
  output: string[];
  exitCode: number;
  startTime: Date;
  endTime: Date;
  duration: number;
  status: 'success' | 'error';
}

class ProcessManager extends EventEmitter {
  private commandHistory: CommandResult[] = [];
  private activeProcesses: Map<number, ChildProcess> = new Map();
  private processCounter: number = 0;

  constructor() {
    super();
  }

  async executeCommand(command: string): Promise<CommandResult> {
    // Get platform-specific command
    const { cmd, args } = this.getPlatformCommand(command);
    const processId = ++this.processCounter;
    const startTime = new Date();
    
    return new Promise((resolve, reject) => {
      const outputHistory: string[] = [];
      
      try {
        // Use shell option for Windows
        const child = spawn(cmd, args, {
          shell: process.platform === 'win32',
          windowsVerbatimArguments: true
        });
        this.activeProcesses.set(processId, child);

        // Log process start
        console.log(`[Process ${processId}] Starting command: ${command}`);
        
        child.stdout.on('data', (data: Buffer) => {
          const output = data.toString().trim();
          console.log(`[Process ${processId}] stdout: ${output}`);
          outputHistory.push(`stdout: ${output}`);
        });

        child.stderr.on('data', (data: Buffer) => {
          const errorOutput = data.toString().trim();
          console.error(`[Process ${processId}] stderr: ${errorOutput}`);
          outputHistory.push(`stderr: ${errorOutput}`);
        });

        child.on('error', (error) => {
          const errorMessage = `Failed to start process: ${error.message}`;
          console.error(`[Process ${processId}] ${errorMessage}`);
          outputHistory.push(`error: ${errorMessage}`);
          reject(error);
        });

        child.on('exit', (code: number | null) => {
          const endTime = new Date();
          const duration = endTime.getTime() - startTime.getTime();
          
          const result: CommandResult = {
            command,
            output: outputHistory,
            exitCode: code ?? -1,
            startTime,
            endTime,
            duration,
            status: code === 0 ? 'success' : 'error'
          };

          console.log(`[Process ${processId}] Completed with code ${code} (${duration}ms)`);
          
          this.commandHistory.push(result);
          this.activeProcesses.delete(processId);
          this.emit('processComplete', result);
          
          resolve(result);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  private getPlatformCommand(command: string): { cmd: string; args: string[] } {
    const [originalCmd, ...originalArgs] = command.split(' ');
    
    if (process.platform === 'win32') {
      // Windows command mappings
      const windowsCommands: { [key: string]: string } = {
        'ls': 'dir',
        'ls -la': 'dir',
        'pwd': 'cd',
        'rm': 'del',
        'cp': 'copy',
        'mv': 'move',
        'cat': 'type'
      };

      const windowsCmd = windowsCommands[command] || windowsCommands[originalCmd] || originalCmd;
      return {
        cmd: windowsCmd,
        args: windowsCmd === originalCmd ? originalArgs : []
      };
    }

    return {
      cmd: originalCmd,
      args: originalArgs
    };
  }

  getHistory(): CommandResult[] {
    return [...this.commandHistory];
  }

  getActiveProcesses(): number {
    return this.activeProcesses.size;
  }

  clearHistory(): void {
    this.commandHistory = [];
  }
}

// Modified example usage
async function runExample() {
  const processManager = new ProcessManager();

  // Listen for process completion events
  processManager.on('processComplete', (result: CommandResult) => {
    console.log('Process completed:', {
      command: result.command,
      status: result.status,
      duration: `${result.duration}ms`
    });
  });

  try {
    // Run platform-agnostic examples
    if (process.platform === 'win32') {
      // Windows specific commands
      await processManager.executeCommand('dir');
      await processManager.executeCommand('cd');
      await processManager.executeCommand('echo Hello World');
    } else {
      // Unix/Linux specific commands
      await processManager.executeCommand('ls -la');
      await processManager.executeCommand('pwd');
      await processManager.executeCommand('echo "Hello World"');
    }
    
    // Get and display history
    const history = processManager.getHistory();
    console.log('\nCommand History:');
    history.forEach((result, index) => {
      console.log(`\n--- Command ${index + 1} ---`);
      console.log(`Command: ${result.command}`);
      console.log(`Status: ${result.status}`);
      console.log(`Duration: ${result.duration}ms`);
      console.log('Output:');
      result.output.forEach(line => console.log(`  ${line}`));
    });
  } catch (error) {
    console.error('Error running commands:', error);
  }
}

// Run the example
runExample();

export { ProcessManager, CommandResult };