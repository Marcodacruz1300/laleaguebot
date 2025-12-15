const { Octokit } = require("@octokit/rest");
const matter = require("gray-matter");

const OWNER = "Marcodacruz1300";   // ton compte GitHub
const REPO = "stonr";              // ton repo
const BRANCH = "main";             // ta branche
const PRODUCTS_DIR = "content/produits";

exports.handler = async (event) => {
  try {
    const slug = event.queryStringParameters.slug;
    if (!slug) {
      return {
        statusCode: 400,
        body: JSON.stringify({ ok: false, error: { name: "ValidationError", message: "slug requis" } })
      };
    }

    const filePath = `${PRODUCTS_DIR}/${slug}.md`;
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    // Récupérer le contenu du fichier
    const { data: file } = await octokit.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path: filePath,
      ref: BRANCH
    });

    const content = Buffer.from(file.content, "base64").toString("utf8");
    const parsed = matter(content);

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, product: { slug, ...parsed.data } })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: { name: err.name || "Error", message: err.message } })
    };
  }
};
