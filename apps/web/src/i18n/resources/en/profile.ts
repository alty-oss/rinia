const profile = {
        fullName: "Full name", username: "Username", usernameHint: "One word, like a nickname or first name", email: "Email", profilePhoto: "Profile photo", profilePhotoUrl: "Profile photo URL", addPhoto: "Add profile photo", changePhoto: "Change profile photo", removePhoto: "Remove photo", databaseBackup: "Database backup",
        backupDescription: "Download all database data, including projects, issues, and users, for restoring the platform.",
        downloadBackup: "Download backup", profileSaved: "Profile saved.", couldNotSave: "Could not save the profile.",
        languageDescription: "Choose the language used across Rinia.",
        theme: "Theme", themeDescription: "Choose the appearance used across Rinia.",
        themeSystem: "System", themeLight: "Light", themeDark: "Dark", themeLightContrast: "Light high contrast", themeDarkContrast: "Dark high contrast",
        apiTokens: "API tokens", apiTokensDescription: "Let tools such as Claude Code read and change Rinia for you. A token can do everything you can.",
        tokenName: "Token name", tokenNameHint: "Where it will be used, so you can recognize it later", tokenNamePlaceholder: "Claude Code on my laptop", createToken: "Create token",
        newToken: "Copy your new token", newTokenHint: "It will not be shown again. Keep it somewhere safe, like a password.", copyToken: "Copy token", tokenCopied: "Token copied", hideToken: "I have copied it",
        tokenCreatedOn: "Created {{date}}", tokenLastUsed: "last used {{date}}", tokenNeverUsed: "never used", noApiTokens: "No tokens yet.",
        revokeToken: "Revoke token", revokeTokenNamed: "Revoke {{name}}", revokeTokenDescription: "Anything using “{{name}}” loses access right away. This cannot be undone.",
        couldNotLoadTokens: "Could not load your tokens.", couldNotCreateToken: "Could not create the token.", couldNotRevokeToken: "Could not revoke the token.",
    } as const;

export default profile;
