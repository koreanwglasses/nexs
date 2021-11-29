const config = {
  dev: process.env.NODE_ENV === "development",

  server: {
    /**
     * Port to start express server on
     */
    port: +(process.env.PORT || 3000),
    host: process.env.HOST ?? "localhost",
  },
};

export default config;
