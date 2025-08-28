module.exports = async () => {
    return {
        preset: "ts-jest",
        rootDir: "./",
        verbose: true,
        transform: {
            "^.+\\.js?$": "babel-jest",
        },
        testEnvironment: "node",
        testResultsProcessor: "jest-sonar-reporter",
        setupFilesAfterEnv: ["jest-extended"],
        coverageReporters: ["clover", "lcov", "text-summary", "cobertura", "text"],
    };
};
