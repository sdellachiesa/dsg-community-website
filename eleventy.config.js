
module.exports = function (eleventyConfig) {

  // Diagnostic: confirm that this configuration file is loaded
  console.log("### MY ELEVENTY CONFIG IS LOADED ###");

  const fs = require("fs");
  const matter = require("gray-matter");

  const source = fs.readFileSync("src/index.njk", "utf8");
  const parsed = matter(source);

  console.log("### ACTUAL FILE TITLE:", parsed.data.title);
  console.log("### CONTENT STARTS:", JSON.stringify(parsed.content.slice(0, 80)));

  // Read and parse the Data Stewards CSV file
  function parseCSV(text) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const next = text[i + 1];

      if (inQuotes) {
        if (char === '"' && next === '"') {
          field += '"';
          i++;
        } else if (char === '"') {
          inQuotes = false;
        } else {
          field += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          row.push(field);
          field = "";
        } else if (char === '\n') {
          row.push(field);
          rows.push(row);
          row = [];
          field = "";
        } else if (char !== '\r') {
          field += char;
        }
      }
    }

    if (field.length || row.length) {
      row.push(field);
      rows.push(row);
    }

    const headers = rows.shift().map(header => header.trim());

    return rows
      .filter(row => row.some(value => value.trim() !== ""))
      .map(row => {
        const entry = {};
        headers.forEach((header, index) => {
          entry[header] = (row[index] || "").trim();
        });
        return entry;
      });
  }

  // Make CSV data available to Nunjucks as "datastewards"
  eleventyConfig.addGlobalData("datastewards", () => {
    const csv = fs.readFileSync("src/_data/datastewards.csv", "utf8");

    return parseCSV(csv).map(row => ({
      "job-profile": row["job-profile"],
      institution: row.institution,
      city: row.city,
      longitude: Number(row.longitude),
      latitude: Number(row.latitude)
    }));
  });

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
