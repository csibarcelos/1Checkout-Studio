
import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from "react-router-dom";
import { Product } from '../types';
import { productService } from '../services/productService';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Modal } from '../components/ui/Modal';
import { CubeIcon, PlusIcon, DocumentDuplicateIcon as DocumentDuplicateIconDefault, CheckCircleIcon, TrashIcon as TrashIconDefault } from '@/constants.tsx'; 
import { useAuth } from '../contexts/AuthContext'; 

const EyeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const PencilIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
);

const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isCloning, setIsCloning] = useState<string | null>(null); // Store ID of product being cloned
  const [copiedLinkProductId, setCopiedLinkProductId] = useState<string | null>(null);


  const navigate = useNavigate();
  const { accessToken } = useAuth(); 

  const fetchProducts = useCallback(async () => {
    if (!accessToken) {
        // Se o token não estiver disponível, não faz sentido tentar carregar
        // produtos que dependem de autenticação.
        // Pode ser que o AuthContext ainda esteja carregando o token.
        setIsLoading(false); // Parar o loading se não houver token
        setProducts([]); // Limpar produtos
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await productService.getProducts(accessToken); 
      setProducts(data.sort((a,b) => (a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1)));
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar produtos. Tente novamente.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]); 

  useEffect(() => {
    // O accessToken pode ser null inicialmente enquanto o AuthContext carrega.
    // A useCallback `fetchProducts` já tem uma guarda para accessToken null.
    fetchProducts();
  }, [fetchProducts]);

  const openDeleteModal = (product: Product) => {
    setProductToDelete(product);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setProductToDelete(null);
    setIsDeleteModalOpen(false);
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    setIsLoading(true); 
    try {
      await productService.deleteProduct(productToDelete.id, accessToken); 
      fetchProducts(); 
      closeDeleteModal();
    } catch (err: any) {
      setError(`Falha ao deletar produto ${productToDelete.name}.`);
      console.error(err);
    } finally {
      setIsLoading(false); // Certifique-se de resetar o loading mesmo em caso de erro
    }
  };
  
  const handleCloneProduct = async (productId: string) => {
    setIsCloning(productId);
    setError(null);
    try {
      const clonedProduct = await productService.cloneProduct(productId, accessToken); 
      if (clonedProduct) {
        fetchProducts(); 
        // Opcional: rolar para o novo produto ou destacar
      } else {
        setError('Falha ao clonar produto. Nenhum produto retornado.');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao clonar produto.');
      console.error(err);
    } finally {
      setIsCloning(null);
    }
  };

  const handleCopyLink = (productSlug: string | undefined) => {
    if (!productSlug) {
        alert('Slug do produto não encontrado para copiar o link.');
        return;
    }
    const checkoutUrl = `${window.location.origin}${window.location.pathname}#/checkout/${productSlug}`;
    navigator.clipboard.writeText(checkoutUrl)
      .then(() => {
        setCopiedLinkProductId(productSlug); 
        setTimeout(() => setCopiedLinkProductId(null), 2000);
      })
      .catch(err => {
        console.error('Failed to copy link: ', err);
        alert('Falha ao copiar o link.');
      });
  };


  if (isLoading && products.length === 0) { 
    return <div className="flex justify-center items-center h-64"><LoadingSpinner size="lg" /></div>;
  }

  if (error) {
    return <div className="text-center text-red-400 p-4 bg-red-800/20 rounded-md">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-neutral-100">Meus Produtos</h1>
        <Button to="/produtos/novo" variant="primary" leftIcon={<PlusIcon className="h-5 w-5"/>}>
          Criar Produto
        </Button>
      </div>

      {products.length === 0 && !isLoading ? (
        <Card className="text-center py-12">
          <CubeIcon className="h-16 w-16 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-neutral-100 mb-2">Nenhum produto encontrado</h3>
          <p className="text-neutral-400 mb-6">Crie seu primeiro produto para começar a vender.</p>
          <Button to="/produtos/novo" variant="primary" leftIcon={<PlusIcon className="h-5 w-5"/>}>
            Criar Primeiro Produto
          </Button>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <Card className="shadow-xl p-0 sm:p-0 border-neutral-700"> 
            <table className="min-w-full divide-y divide-neutral-700">
              <thead className="bg-neutral-700/50"> 
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider">Nome</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider">Preço</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider">Vendas</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-neutral-300 uppercase tracking-wider">Conversão</th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-neutral-300 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-neutral-800 divide-y divide-neutral-700">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-neutral-700/70 transition-colors duration-150"> 
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-neutral-100">{product.name}</div>
                      <div className="text-xs text-neutral-400 truncate max-w-xs">{product.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-300">
                      R$ {(product.priceInCents / 100).toFixed(2).replace('.',',')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-300">{product.totalSales || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-300">
                      {product.conversionRate !== undefined ? `${product.conversionRate.toFixed(1)}%` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-1">
                      <Button variant="ghost" size="sm" title="Ver Checkout" onClick={() => product.slug && navigate(`/checkout/${product.slug}`)} className="text-primary hover:text-primary-dark p-1.5" disabled={!product.slug}>
                        <EyeIcon className="h-5 w-5" />
                      </Button>
                      <Button variant="ghost" size="sm" title="Copiar Link do Checkout" onClick={() => handleCopyLink(product.slug)} className="text-neutral-400 hover:text-primary p-1.5" disabled={!product.slug}>
                        {copiedLinkProductId === product.slug ? <CheckCircleIcon className="h-5 w-5 text-green-400" /> : <DocumentDuplicateIconDefault className="h-5 w-5" />}
                      </Button>
                       <Button variant="ghost" size="sm" title="Clonar" onClick={() => handleCloneProduct(product.id)} disabled={isCloning === product.id} isLoading={isCloning === product.id} className="text-neutral-400 hover:text-primary p-1.5">
                        <DocumentDuplicateIconDefault className="h-5 w-5" />
                      </Button>
                      <Button variant="ghost" size="sm" title="Editar" onClick={() => navigate(`/produtos/editar/${product.id}`)} className="text-neutral-300 hover:text-primary p-1.5">
                        <PencilIcon className="h-5 w-5" />
                      </Button>
                      <Button variant="ghost" size="sm" title="Excluir" onClick={() => openDeleteModal(product)} className="text-red-500 hover:text-red-400 p-1.5">
                        <TrashIconDefault className="h-5 w-5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
      
      <Modal isOpen={isDeleteModalOpen} onClose={closeDeleteModal} title="Confirmar Exclusão">
        <p className="text-neutral-300">
          Você tem certeza que deseja excluir o produto "{productToDelete?.name}"? Esta ação não poderá ser desfeita.
        </p>
        <div className="mt-6 flex justify-end space-x-3">
          <Button variant="ghost" onClick={closeDeleteModal} disabled={isLoading && !!productToDelete}>Cancelar</Button>
          <Button variant="danger" onClick={handleDeleteProduct} isLoading={isLoading && !!productToDelete}>Excluir Produto</Button>
        </div>
      </Modal>
    </div>
  );
};

export default ProductsPage;
