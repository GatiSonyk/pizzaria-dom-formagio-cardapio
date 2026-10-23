import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, ImagePlus, LogOut, Plus, RefreshCw, Save, Trash2, Upload, UtensilsCrossed } from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "./AuthProvider.jsx";

const CATEGORIES = ["Tradicionais", "Especiais", "Doces", "Bebidas"];
const blankDraft = () => ({
  name: "", slug: "", category: "Tradicionais", description: "", image_url: "",
  price_large: "", price_medium: "", price_small: "", price_unit: "", is_available: true,
});
const slugify = (text) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const toAmount = (value) => value === "" || value === null || value === undefined ? null : Number(value);

export default function AdminPage() {
  const { user, profile, signOut, configured } = useAuth();
  const canManage = ["administrador", "equipe"].includes(profile?.role);
  const [products, setProducts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(blankDraft);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [borderPrice, setBorderPrice] = useState("18.00");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("Todas");

  useEffect(() => {
    if (!imageFile) { setImagePreview(null); return undefined; }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const loadCatalog = useCallback(async () => {
    if (!supabase || !canManage) return;
    setLoading(true);
    setError("");
    const [productsResult, settingsResult] = await Promise.all([
      supabase.from("products").select("*").order("sort_order").order("name"),
      supabase.from("catalog_settings").select("border_addon_price").eq("id", 1).maybeSingle(),
    ]);
    if (productsResult.error) {
      setError("Não foi possível carregar os produtos. Confirme se a migração do catálogo já foi aplicada ao Supabase. " + productsResult.error.message);
    } else {
      setProducts(productsResult.data || []);
      // Start with a blank form; never silently select the first product for editing.
      setSelectedId((current) => (
        current !== null && !productsResult.data?.some((item) => item.id === current)
          ? null
          : current
      ));
    }
    if (!settingsResult.error && settingsResult.data) {
      setBorderPrice(String(settingsResult.data.border_addon_price));
    }
    setLoading(false);
  }, [canManage]);

  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  function editProduct(item) {
    setSelectedId(item.id);
    setDraft({
      name: item.name || "", slug: item.slug || "", category: item.category || "Tradicionais",
      description: item.description || "", image_url: item.image_url || "",
      price_large: item.price_large ?? "", price_medium: item.price_medium ?? "",
      price_small: item.price_small ?? "", price_unit: item.price_unit ?? "",
      is_available: item.is_available !== false,
    });
    setImageFile(null);
    setNotice("");
    setError("");
  }

  function newProduct() {
    setSelectedId(null);
    setDraft(blankDraft());
    setImageFile(null);
    setNotice("");
    setError("");
  }

  async function saveProduct(event) {
    event.preventDefault();
    if (!supabase || !canManage) return;
    if (!draft.name.trim()) { setError("Informe o nome do produto."); return; }
    setSaving(true);
    setNotice("");
    setError("");
    try {
      const slug = (draft.slug.trim() || slugify(draft.name));
      let imageUrl = draft.image_url || null;
      if (imageFile) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(imageFile.type)) {
          throw new Error("Use uma imagem JPG, PNG ou WebP.");
        }
        if (imageFile.size > 5 * 1024 * 1024) throw new Error("A imagem deve ter no máximo 5 MB.");
        const safeFileName = imageFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const storagePath = slug + "/" + Date.now() + "-" + safeFileName;
        const { error: uploadError } = await supabase.storage.from("product-images").upload(storagePath, imageFile, {
          contentType: imageFile.type, upsert: false,
        });
        if (uploadError) throw uploadError;
        imageUrl = supabase.storage.from("product-images").getPublicUrl(storagePath).data.publicUrl;
      }

      const payload = {
        slug, name: draft.name.trim(), category: draft.category,
        description: draft.description.trim(), image_url: imageUrl,
        price_large: toAmount(draft.price_large), price_medium: toAmount(draft.price_medium),
        price_small: toAmount(draft.price_small), price_unit: toAmount(draft.price_unit),
        is_available: Boolean(draft.is_available),
      };
      let result;
      if (selectedId !== null) {
        result = await supabase.from("products").update(payload).eq("id", selectedId).select().single();
      } else {
        payload.sort_order = products.length ? Math.max(...products.map((item) => item.sort_order || 0)) + 1 : 1;
        result = await supabase.from("products").insert(payload).select().single();
      }
      if (result.error) throw result.error;
      setNotice("Produto salvo. O cardápio público será atualizado automaticamente.");
      setSelectedId(result.data.id);
      setDraft({
        ...result.data,
        price_large: result.data.price_large ?? "", price_medium: result.data.price_medium ?? "",
        price_small: result.data.price_small ?? "", price_unit: result.data.price_unit ?? "",
      });
      setImageFile(null);
      await loadCatalog();
    } catch (e) {
      setError(e?.message || "Não foi possível salvar o produto.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleAvailability(item) {
    const { error: updateError } = await supabase.from("products")
      .update({ is_available: !item.is_available }).eq("id", item.id);
    if (updateError) setError("Não foi possível alterar a disponibilidade: " + updateError.message);
    else { setNotice(item.is_available ? "Produto marcado como indisponível." : "Produto voltou a ficar disponível."); await loadCatalog(); }
  }

  async function deleteProduct(item) {
    if (!window.confirm("Excluir definitivamente " + item.name + "?")) return;
    const { error: deleteError } = await supabase.from("products").delete().eq("id", item.id);
    if (deleteError) { setError("Não foi possível excluir: " + deleteError.message); return; }
    setNotice("Produto excluído.");
    if (selectedId === item.id) newProduct();
    await loadCatalog();
  }

  async function saveSettings(event) {
    event.preventDefault();
    const amount = toAmount(borderPrice);
    if (amount === null || !Number.isFinite(amount) || amount < 0) { setError("Informe um valor válido para a borda."); return; }
    setSavingSettings(true);
    setError("");
    const { error: settingsError } = await supabase.from("catalog_settings")
      .update({ border_addon_price: amount }).eq("id", 1);
    if (settingsError) setError("Não foi possível salvar o adicional: " + settingsError.message);
    else setNotice("Valor da borda recheada atualizado.");
    setSavingSettings(false);
  }

  async function logout() {
    const { error: logoutError } = await signOut();
    if (logoutError) setError("Não foi possível sair. Tente novamente.");
    else window.location.assign("/login");
  }

  if (!configured) return <main className="auth-shell"><section className="auth-card"><h1>Configuração pendente</h1><p>Defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no ambiente do site.</p><Link to="/">Voltar ao cardápio</Link></section></main>;

  if (!canManage) return <main className="auth-shell"><section className="auth-card auth-dashboard">
    <p className="auth-eyebrow">DOM FORMÁGIO NA SERRA</p><h1>Minha conta</h1>
    <p>Você está conectado como <strong>{user?.email}</strong>.</p><p>Perfil: <strong>{profile?.role || "sem perfil"}</strong>. Este perfil não pode administrar produtos.</p>
    <button className="auth-submit" onClick={logout}><LogOut size={16}/> Sair</button><Link to="/">Abrir cardápio público</Link>
  </section></main>;

  const visibleProducts = products.filter((item) => filter === "Todas" || item.category === filter);

  return <main className="admin-shell">
    <header className="admin-header">
      <Link to="/" className="admin-back"><ArrowLeft size={17}/> Cardápio público</Link>
      <div className="admin-heading"><span className="auth-eyebrow">DOM FORMÁGIO NA SERRA</span><h1>Gerenciar cardápio</h1><p>Fotos, ingredientes, preços e disponibilidade.</p></div>
      <div className="admin-user"><span>{user?.email}</span><button type="button" onClick={logout} title="Sair"><LogOut size={17}/></button></div>
    </header>

    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-list-head"><div><h2>Produtos</h2><p>{products.length} cadastrados</p></div><button type="button" onClick={newProduct} title="Novo produto"><Plus size={18}/></button></div>
        <div className="admin-filters"><select aria-label="Filtrar categoria" value={filter} onChange={(e) => setFilter(e.target.value)}><option>Todas</option>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select><button type="button" onClick={loadCatalog} disabled={loading} title="Atualizar"><RefreshCw size={15}/></button></div>
        {loading && <p className="admin-muted">Carregando catálogo…</p>}
        <div className="admin-product-list">{visibleProducts.map((item) => <button type="button" key={item.id} onClick={() => editProduct(item)} className={"admin-product-row" + (selectedId === item.id ? " selected" : "")}>
          <img src={item.image_url || "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=100&q=70"} alt=""/>
          <span><strong>{item.name}</strong><small>{item.category}</small></span><i className={item.is_available ? "status-dot available" : "status-dot unavailable"}/>
        </button>)}</div>
      </aside>

      <section className="admin-editor">
        {error && <div className="admin-alert error" role="alert">{error}</div>}
        {notice && <div className="admin-alert success" role="status"><Check size={16}/>{notice}</div>}
        <form onSubmit={saveProduct}>
          <div className="admin-editor-title"><div><span className="section-kicker">{selectedId === null ? "NOVO CADASTRO" : "EDIÇÃO DE PRODUTO"}</span><h2>{draft.name || "Novo produto"}</h2></div>
            {selectedId !== null && <button type="button" className="admin-delete" onClick={() => deleteProduct(products.find((p) => p.id === selectedId) || {id:selectedId,name:draft.name})}><Trash2 size={16}/> Excluir</button>}
          </div>
          <div className="admin-form-grid">
            <label>Nome do produto<input value={draft.name} onChange={(e) => setDraft({...draft,name:e.target.value})} required/></label>
            <label>Categoria<select value={draft.category} onChange={(e) => setDraft({...draft,category:e.target.value})}>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
            <label className="full">Identificador (URL)<input value={draft.slug} onChange={(e) => setDraft({...draft,slug:e.target.value})} placeholder={slugify(draft.name) || "nome-do-produto"}/></label>
            <label className="full">Descrição e ingredientes<textarea rows="4" value={draft.description} onChange={(e) => setDraft({...draft,description:e.target.value})} placeholder="Ingredientes, detalhes e observações"/></label>
          </div>

          <div className="admin-section-title"><ImagePlus size={18}/><h3>Foto do produto</h3></div>
          <div className="admin-image-upload">
            <div className="admin-image-preview">{(imageFile || draft.image_url) ? <img src={imageFile ? imagePreview : draft.image_url} alt="Prévia do produto"/> : <div><ImagePlus size={30}/><span>Nenhuma foto enviada</span></div>}</div>
            <div className="admin-upload-copy"><p>Envie uma foto real do produto. Formatos JPG, PNG ou WebP, até 5 MB.</p><label className="admin-upload-button"><Upload size={16}/> Escolher foto<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setImageFile(e.target.files?.[0] || null)}/></label>{imageFile && <button type="button" className="admin-text-button" onClick={() => setImageFile(null)}>Cancelar nova foto</button>}</div>
          </div>

          <div className="admin-section-title"><UtensilsCrossed size={18}/><h3>Preços (R$)</h3></div>
          <p className="admin-muted">Deixe em branco os valores que ainda precisam ser confirmados. Bebidas podem usar o preço unitário.</p>
          <div className="admin-form-grid price-grid">
            <label>Grande<input type="number" min="0" step="0.01" value={draft.price_large} onChange={(e) => setDraft({...draft,price_large:e.target.value})} placeholder="Não definido"/></label>
            <label>Média<input type="number" min="0" step="0.01" value={draft.price_medium} onChange={(e) => setDraft({...draft,price_medium:e.target.value})} placeholder="Não definido"/></label>
            <label>Pequena<input type="number" min="0" step="0.01" value={draft.price_small} onChange={(e) => setDraft({...draft,price_small:e.target.value})} placeholder="Não definido"/></label>
            <label>Preço unitário<input type="number" min="0" step="0.01" value={draft.price_unit} onChange={(e) => setDraft({...draft,price_unit:e.target.value})} placeholder="Para bebidas ou preço único"/></label>
          </div>

          <div className="admin-availability"><label><input type="checkbox" checked={draft.is_available} onChange={(e) => setDraft({...draft,is_available:e.target.checked})}/> Produto disponível no cardápio público</label><span className={draft.is_available ? "availability-pill on" : "availability-pill off"}>{draft.is_available ? "Disponível" : "Indisponível"}</span></div>
          <div className="admin-save-row"><button className="auth-submit" type="submit" disabled={saving}><Save size={17}/>{saving ? "Salvando…" : "Salvar produto"}</button><button type="button" className="admin-secondary" onClick={newProduct}>Cancelar</button></div>
        </form>

        {profile?.role === "administrador" && <form className="admin-settings" onSubmit={saveSettings}>
          <div><span className="section-kicker">CONFIGURAÇÕES DO CARDÁPIO</span><h3>Adicional de borda recheada</h3><p>O valor é usado no cálculo dos pedidos de pizza.</p></div>
          <label>Valor (R$)<input type="number" min="0" step="0.01" value={borderPrice} onChange={(e) => setBorderPrice(e.target.value)} required/></label>
          <button className="admin-secondary" type="submit" disabled={savingSettings}>{savingSettings ? "Salvando…" : "Atualizar valor"}</button>
        </form>}
      </section>
    </div>
  </main>;
}
