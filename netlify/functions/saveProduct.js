// netlify/functions/saveProduct.js
const { Octokit } = require("@octokit/rest");

const OWNER = "Marcodacruz1300";
const REPO = "laleaguebot";   // ⚡ nouveau repo
const BRANCH = "main";
const PRODUCTS_DIR = "content/produits";
const PRODUCTS_JSON = "products.json";

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const body = JSON.parse(event.body || "{}");
    const { slug, title, description, price, image } = body;

    if (!slug) {
      return {
        statusCode: 400,
        body: JSON.stringify({ ok: false, error: { name: "ValidationError", message: "slug requis" } })
      };
    }

    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    // 1) Créer/mettre à jour le fichier Markdown du produit
    const filePath = `${PRODUCTS_DIR}/${slug}.md`;
    const mdContent = `# ${title}\n\n${description}\n\nPrix: ${price}€`;

    let sha;
    try {
      const { data: file } = await octokit.repos.getContent({
        owner: OWNER,
        repo: REPO,
        path: filePath,
        ref: BRANCH
      });
      sha = file.sha;
    } catch (err) {
      if (err.status !== 404) throw err;
    }

    await octokit.repos.createOrUpdateFileContents({
      owner: OWNER,
      repo: REPO,
      path: filePath,
      message: `Save product ${slug}`,
      content: Buffer.from(mdContent).toString("base64"),
      branch: BRANCH,
      sha
    });

    // 2) Mettre à jour products.json
    const { data: jsonFile } = await octokit.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path: PRODUCTS_JSON,
      ref: BRANCH
    });
    const productsSha = jsonFile.sha;
    const jsonContent = Buffer.from(jsonFile.content, "base64").toString("utf8");
    let products = JSON.parse(jsonContent);

    // remplacer ou ajouter
    products = products.filter(p => p.slug !== slug);
    products.push({ slug, title, description, price, image });

    const newJsonContent = JSON.stringify(products, null, 2);

    await octokit.repos.createOrUpdateFileContents({
      owner: OWNER,
      repo: REPO,
      path: PRODUCTS_JSON,
      message: `Update products.json with ${slug}`,
      content: Buffer.from(newJsonContent).toString("base64"),
      branch: BRANCH,
      sha: productsSha
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, product: { slug, title, description, price, image } })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: { name: err.name, message: err.message } })
    };
  }
};
