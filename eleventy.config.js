
module.exports = function (eleventyConfig) {

  // Copy images and CSS to the final website
  eleventyConfig.addPassthroughCopy("src/assets");

  // Register the base layout
  eleventyConfig.addLayoutAlias("base", "layouts/base.njk");

  return {
    // Website source and output folders
    dir: {
      input: "src",
      includes: "_includes",
      output: "_site"
    },

    // File formats processed by Eleventy
    templateFormats: ["njk", "md", "html"],

    // Allow Nunjucks in Markdown and HTML
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk"
  };
};
