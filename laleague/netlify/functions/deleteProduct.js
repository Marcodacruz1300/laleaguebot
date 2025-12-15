const { Octokit } = require("@octokit/rest");

const OWNER = "Marcodacruz1300";
const REPO = "stonr";
const BRANCH = "main";
const PRODUCTS_DIR = "content/produits";
const PRODUCTS_JSON = "products.json";

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { slug } = body;

    if (!slug) {
      return {
        statusCode: 400,
        body: JSON.stringify({ ok: false, error: { name: "ValidationError", message: "slug requis" } })
      };
    }

    const filePath = `${PRODUCTS_DIR}/${slug}.md`;
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    // --- 1) Récupérer le sha du fichier produit ---
    const { data: file } = await octokit.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path: filePath,
      ref: BRANCH
    });
    const sha = file.sha;

    // --- 2) Supprimer le fichier produit ---
    await octokit.repos.deleteFile({
      owner: OWNER,
      repo: REPO,
      path: filePath,
      message: `Delete product ${slug}`,
      branch: BRANCH,
      sha
    });

    // --- 3) Mettre à jour products.json ---
    let productsSha = null;
    let products = [];
    try {
      const { data: jsonFile } = await octokit.repos.getContent({
        owner: OWNER,
        repo: REPO,
        path: PRODUCTS_JSON,
        ref: BRANCH
      });
      productsSha = jsonFile.sha;
      const jsonContent = Buffer.from(jsonFile.content, "base64").toString("utf8");
      products = JSON.parse(jsonContent);
    } catch (err) {
      if (err.status !== 404) throw err;
      products = [];
    }

    // Retirer le produit du JSON et récupérer son image
    let imagePathToDelete = null;
    products = products.filter(p => {
      if (p.slug === slug && p.image) {
        // l'image est stockée comme "/content/images/xxx.png"
        imagePathToDelete = p.image.startsWith("/") ? p.image.slice(1) : p.image;
      }
      return p.slug !== slug;
    });

    const newJsonContent = JSON.stringify(products, null, 2);

    await octokit.repos.createOrUpdateFileContents({
      owner: OWNER,
      repo: REPO,
      path: PRODUCTS_JSON,
      message: `Update products.json after deleting ${slug}`,
      content: Buffer.from(newJsonContent).toString("base64"),
      branch: BRANCH,
      sha: productsSha || undefined
    });

    // --- 4) Supprimer l'image associée si elle existe ---
    if (imagePathToDelete) {
      try {
        const { data: imgFile } = await octokit.repos.getContent({
          owner: OWNER,
          repo: REPO,
          path: imagePathToDelete,
          ref: BRANCH
        });
        await octokit.repos.deleteFile({
          owner: OWNER,
          repo: REPO,
          path: imagePathToDelete,
          message: `Delete image for product ${slug}`,
          branch: BRANCH,
          sha: imgFile.sha
        });
      } catch (err) {
        // si l'image n'existe pas ou déjà supprimée, on ignore
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, message: "Produit et image supprimés", slug })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: { name: err.name || "Error", message: err.message } })
    };
  }
};
