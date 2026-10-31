// SPDX-License-Identifier: MPL-2.0
import type {SpawnOptions} from 'node:child_process';
export interface ProfilePaths {userDataDirectory: string; extensionsDirectory: string;}
export interface LaunchProfile extends ProfilePaths {workspaceFile?: string; schemaFile?: string; schemaId?: string; format?: 'yaml' | 'json';}
export interface ChildProcessPort {
 once(event: string, listener: (...args: any[]) => void): unknown;
 kill(): unknown;
 unref(): void;
}
export type SpawnProcess = (command: string, args: string[], options: SpawnOptions) => ChildProcessPort;
export interface LaunchOptions {
 findExecutable?: () => Promise<string>;
 spawnProcess?: SpawnProcess;
 platform?: NodeJS.Platform;
 timeoutMs?: number;
 startupGraceMs?: number;
 checkReady?: (directory: string, options: {platform: NodeJS.Platform}) => Promise<void>;
 ensureSupport?: (profile: ProfilePaths) => Promise<void>;
}
export interface DocumentEditorHostOptions {
 siteDirectory: string;
 dataDirectory?: string;
 launchEditor?: (file: string, profile: LaunchProfile) => unknown;
 port?: number;
 publicPath?: string;
 editorPath?: string;
}
export interface CLIOptions {siteDirectory?: string; dataDirectory?: string; port?: number;}
