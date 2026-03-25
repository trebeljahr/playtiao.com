module.exports = function () {
  return {
    name: "webpack-polyfills",
    configureWebpack() {
      return {
        resolve: {
          fallback: {
            path: require.resolve("path-browserify"),
          },
        },
      };
    },
  };
};
