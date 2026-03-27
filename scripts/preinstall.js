const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const PATH = {
    packageJSON: path.join(__dirname, "../package.json")
};

function checkCreatorTypesVersion(version) {
    try {
        // Choose the appropriate npm command based on platform
        const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
        
        // Check if npm command is available
        const npmCheck = spawnSync(npmCmd, ["--version"], { 
            stdio: 'pipe',
            shell: process.platform === "win32"
        });
        
        if (npmCheck.error || npmCheck.status !== 0) {
            console.warn("Warning: npm command not available, skipping version check");
            return true; // Skip check if npm is not available
        }
        
        // Get version list
        const result = spawnSync(npmCmd, ["view", "@cocos/creator-types", "versions"], { 
            stdio: 'pipe',
            shell: process.platform === "win32"
        });
        
        if (result.error || result.status !== 0) {
            console.warn("Warning: Failed to fetch @cocos/creator-types versions, skipping check");
            return true; // Skip check if fetch failed
        }
        
        let output = result.stdout.toString().trim();
        
        // Try to parse JSON
        try {
            const versions = JSON.parse(output);
            if (Array.isArray(versions)) {
                return versions.includes(version);
            } else if (typeof versions === 'string') {
                return versions.includes(version);
            }
        } catch (parseError) {
            // If JSON parse fails, try handling as string
            return output.includes(version);
        }
        
        return false;
    } catch (error) {
        console.warn("Warning: Version check failed:", error.message);
        return true; // Skip check on error
    }
}

function getCreatorTypesVersion() {
    try {
        // Check if package.json file exists
        if (!fs.existsSync(PATH.packageJSON)) {
            console.warn("Warning: package.json not found");
            return null;
        }
        
        const packageContent = fs.readFileSync(PATH.packageJSON, "utf8");
        const packageJson = JSON.parse(packageContent);
        
        // Check if devDependencies exists
        if (!packageJson.devDependencies || !packageJson.devDependencies["@cocos/creator-types"]) {
            console.warn("Warning: @cocos/creator-types not found in devDependencies");
            return null;
        }
        
        const versionString = packageJson.devDependencies["@cocos/creator-types"];
        return versionString.replace(/^[^\d]+/, "");
    } catch (error) {
        console.warn("Warning: Failed to read package.json:", error.message);
        return null;
    }
}

function main() {
    try {
        const creatorTypesVersion = getCreatorTypesVersion();
        
        if (!creatorTypesVersion) {
            console.log("Skipping @cocos/creator-types version check");
            return;
        }
        
        if (!checkCreatorTypesVersion(creatorTypesVersion)) {
            console.log("\x1b[33mWarning:\x1b[0m");
            console.log("  @en");
            console.log("    Version check of @cocos/creator-types failed.");
            console.log(`    The definition of ${creatorTypesVersion} has not been released yet. Please export the definition to the ./node_modules directory by selecting "Developer -> Export Interface Definition" in the menu of the Creator editor.`);
            console.log("    The definition of the corresponding version will be released on npm after the editor is officially released.");
            console.log("  @zh");
            console.log("    @cocos/creator-types version check failed.");
            console.log(`    The definition of ${creatorTypesVersion} has not been released yet. Please export the definition to the ./node_modules directory via Creator editor menu "Developer -> Export Interface Definition".`);
            console.log("    The definition of the corresponding version will be released on npm after the editor is officially released.");
        }
    } catch (error) {
        console.error("Preinstall script error:", error.message);
        // Don't throw error, let installation continue
        process.exit(0);
    }
}

// Execute main function
main();