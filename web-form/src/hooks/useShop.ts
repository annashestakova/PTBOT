import { useEffect, useState } from 'react';
import { getShopInfo, type ShopInfo } from '../lib/api';

export function useShop() {
  const [shop, setShop] = useState<ShopInfo | null>(null);
  const [shopCode, setShopCode] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('shop') || params.get('s') || '';

    if (!code) {
      setLoading(false);
      return;
    }

    setShopCode(code);

    getShopInfo(code).then((info) => {
      if (info) {
        setShop(info);
      } else {
        // Если магазин не найден в БД — всё равно принимаем код, валидация на сервере
        setShop({ code, name: 'Магазин Продтовары', address: '' });
      }
      setLoading(false);
    });
  }, []);

  return { shop, shopCode, loading };
}
