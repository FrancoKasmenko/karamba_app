import ProductForm from "../product-form";

export default function NuevoProductoPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-gray-800 mb-6">
        Nuevo Producto
      </h1>
      <ProductForm />
    </div>
  );
}
