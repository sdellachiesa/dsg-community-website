
module.exports = function (eleventyConfig) {

  // Copy images and CSS to the final website
  eleventyConfig.addPassthroughCopy("src/assets");

  // Register the base layout
  eleventyConfig.addLayoutAlias("base", "layouts/base.njk");

  // Explicitly register the template formats
  eleventyConfig.setTemplateFormats(["njk", "md", "html"]);

  return {

    // Website source and output folders
    dir: {
      input: "src",
      includes: "_includes",
      output: "_site"
    },

    // Allow Nunjucks in Markdown and HTML
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk"

  };
};
