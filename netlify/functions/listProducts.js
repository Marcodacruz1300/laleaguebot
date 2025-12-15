const { Octokit } = require("@octokit/rest");

const OWNER = "Marcodacruz1300";
const REPO = "stonr";
const BRANCH = "main";
const PRODUCTS_JSON = "products.json";

exports.handler = async () => {
  try {
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    // Récupérer le contenu du fichier products.json
    const { data: jsonFile } = await octokit.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path: PRODUCTS_JSON,
      ref: BRANCH
    });

    const jsonContent = Buffer.from(jsonFile.content, "base64").toString("utf8");
    const products = JSON.parse(jsonContent);

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, products })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: { name: err.name || "Error", message: err.message } })
    };
  }
};
