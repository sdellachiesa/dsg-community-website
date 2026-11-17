
module.exports = function (eleventyConfig) {

  // Diagnostic: confirm that this configuration file is loaded
  console.log("### MY ELEVENTY CONFIG IS LOADED ###");
  const fs = require("fs");
const matter = require("gray-matter");
const source = fs.readFileSync("src/index.njk", "utf8");
const parsed = matter(source);

console.log("### ACTUAL FILE TITLE:", parsed.data.title);
console.log("### CONTENT STARTS:", JSON.stringify(parsed.content.slice(0, 80)));
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
