//===----------------------------------------------------------------------===//
//
// This source file is part of the VSCode Swift open source project
//
// Copyright (c) 2021 the VSCode Swift project authors
// Licensed under Apache License v2.0
//
// See LICENSE.txt for license information
// See CONTRIBUTORS.txt for the list of VSCode Swift project authors
//
// SPDX-License-Identifier: Apache-2.0
//
//===----------------------------------------------------------------------===//

// Based on code taken from CodeLLDB https://github.com/vadimcn/vscode-lldb/
// LICENSED with MIT License

import * as path from "path";
import * as fs from "fs/promises";
import { execFile } from "./utilities";

/**
 * Get LLDB library for given LLDB executable
 * @param executable LLDB executable
 * @returns Library path for LLDB
 */
export async function getLLDBLibPath(executable: string): Promise<string | undefined> {
    try {
        const statement = `print('<!' + lldb.SBHostOS.GetLLDBPath(lldb.ePathTypeLLDBShlibDir).fullpath + '!>')`;
        const args = ["-b", "-O", `script ${statement}`];
        const { stdout } = await execFile(executable, args);
        const m = /^<!([^!]*)!>/m.exec(stdout);
        if (m) {
            return findLibLLDB(m[1]);
        }
    } catch {
        // ignore error just return undefined
    }
    return undefined;
}

async function findLibLLDB(pathHint: string): Promise<string | undefined> {
    const stat = await fs.stat(pathHint);
    if (stat.isFile()) {
        return pathHint;
    }

    let libDir;
    let pattern;
    if (process.platform === "linux") {
        libDir = path.join(pathHint, "lib");
        pattern = /liblldb.*\.so.*/;
    } else if (process.platform === "darwin") {
        libDir = path.join(pathHint, "lib");
        pattern = /liblldb\..*dylib|LLDB/;
    } else if (process.platform === "win32") {
        libDir = path.join(pathHint, "bin");
        pattern = /liblldb\.dll/;
    } else {
        return pathHint;
    }

    for (const dir of [pathHint, libDir]) {
        const file = await findFileByPattern(dir, pattern);
        if (file) {
            return path.join(dir, file);
        }
    }
    return undefined;
}

async function findFileByPattern(path: string, pattern: RegExp): Promise<string | null> {
    try {
        const files = await fs.readdir(path);
        for (const file of files) {
            if (pattern.test(file)) {
                return file;
            }
        }
    } catch (err) {
        // Ignore missing directories and such...
    }
    return null;
}
