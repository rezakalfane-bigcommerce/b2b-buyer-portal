import { LangFormatFunction } from '@b3/lang';

import { store } from '@/store';
import { getActiveCurrencyInfo } from '@/utils';

import {
  B2BOrderData,
  OrderBillings,
  OrderProductItem,
  OrderShippingsItem,
  OrderSummary,
} from '../../../types';

interface CouponInfo {
  [key: string]: string;
}

const getOrderShipping = (data: B2BOrderData) => {
  const { shipments, shippingAddress, products = [] } = data;

  const shipmentsInfo = shipments || [];
  const shippedItems = shipmentsInfo.map((shipment) => {
    const { items } = shipment;

    const itemsInfo: OrderProductItem[] = [];
    items.forEach((item) => {
      const product = products.find((product) => product.id === item.order_product_id);
      if (product) {
        itemsInfo.push({
          ...product,
          current_quantity_shipped: item.quantity,
          not_shipping_number: product.quantity - product.quantity_shipped,
        });
      }
    });

    return {
      ...shipment,
      itemsInfo,
    };
  });

  const shippingAddresses = shippingAddress === false ? [] : shippingAddress;
  const shippings: OrderShippingsItem[] = shippingAddresses.map((address) => ({
    ...address,
    shipmentItems: [
      ...shippedItems.filter((shippedItem) => shippedItem.order_address_id === address.id),
    ],
    notShip: {
      itemsInfo: products
        .filter(
          (product) =>
            product.quantity > product.quantity_shipped && address.id === product.order_address_id,
        )
        .map((product) => ({
          ...product,
          not_shipping_number: product.quantity - product.quantity_shipped,
        })),
    },
  }));

  return shippings;
};

const getOrderBilling = (data: B2BOrderData) => {
  const { billingAddress, products } = data;

  const billings: OrderBillings[] = [
    {
      billingAddress,
      digitalProducts: products.filter((product) => product.type === 'digital'),
    },
  ];

  return billings;
};

const formatPrice = (price: string | number) => {
  const { decimal_places: decimalPlaces = 2 } = getActiveCurrencyInfo();
  try {
    const priceNumber = parseFloat(price.toString()) || 0;
    return priceNumber.toFixed(decimalPlaces);
  } catch (error) {
    return '0.00';
  }
};

const getOrderSummary = (data: B2BOrderData, b3Lang: LangFormatFunction) => {
  const {
    dateCreated,
    firstName,
    lastName,
    totalTax,
    subtotalExTax,
    subtotalIncTax,
    totalExTax,
    totalIncTax,
    handlingCostExTax,
    handlingCostIncTax,
    shippingCostExTax,
    shippingCostIncTax,
    coupons,
    discountAmount,
  } = data;

  const {
    global: { showInclusiveTaxPrice },
  } = store.getState();

  const couponLabel: CouponInfo = {};
  const couponPrice: CouponInfo = {};
  const couponSymbol: CouponInfo = {};

  coupons.forEach((coupon) => {
    const key = b3Lang('orderDetail.summary.coupon', {
      couponCode: coupon?.code ? `(${coupon.code})` : '',
    });
    couponLabel[key] = key;
    couponPrice[key] = coupon?.discount;
    couponSymbol[key] = 'coupon';
  });

  const labels = {
    subTotal: b3Lang('orderDetail.summary.subTotal'),
    shipping: b3Lang('orderDetail.summary.shipping'),
    handingFee: b3Lang('orderDetail.summary.handingFee'),
    discountAmount: b3Lang('orderDetail.summary.discountAmount'),
    ...couponLabel,
    tax: b3Lang('orderDetail.summary.tax'),
    grandTotal: b3Lang('orderDetail.summary.grandTotal'),
  };

  const orderSummary: OrderSummary = {
    createAt: dateCreated,
    name: `${firstName} ${lastName}`,
    priceData: {
      [labels.subTotal]: formatPrice(showInclusiveTaxPrice ? subtotalIncTax : subtotalExTax),
      [labels.shipping]: formatPrice(
        showInclusiveTaxPrice ? shippingCostIncTax : shippingCostExTax,
      ),
      [labels.handingFee]: formatPrice(handlingCostIncTax || handlingCostExTax || ''),
      [labels.discountAmount]: formatPrice(discountAmount || ''),
      ...couponPrice,
      [labels.tax]: formatPrice(totalTax || ''),
      [labels.grandTotal]: formatPrice(totalIncTax || totalExTax || ''),
    },
    priceSymbol: {
      [labels.subTotal]: 'subTotal',
      [labels.shipping]: 'shipping',
      [labels.handingFee]: 'handingFee',
      [labels.discountAmount]: 'discountAmount',
      ...couponSymbol,
      [labels.tax]: 'tax',
      [labels.grandTotal]: 'grandTotal',
    },
  };

  return orderSummary;
};

const getPaymentData = (data: B2BOrderData) => {
  const { updatedAt, billingAddress, paymentMethod, dateCreated } = data;
  const dateCreateAt = new Date(dateCreated).getTime() / 1000;

  return {
    updatedAt,
    billingAddress,
    paymentMethod,
    dateCreateAt: JSON.stringify(dateCreateAt),
  };
};

const handleProductQuantity = (data: B2BOrderData) => {
  const { products } = data;

  const newProducts: OrderProductItem[] = [];

  products.forEach((product) => {
    const productIndex = newProducts.findIndex(
      (item) => Number(item.variant_id) === Number(product.variant_id),
    );

    if (productIndex === -1) {
      newProducts.push(product);
    } else {
      const existedProduct = newProducts[productIndex];

      newProducts[productIndex] = {
        ...existedProduct,
        quantity: Number(existedProduct.quantity) + Number(product.quantity),
      };
    }
  });

  return newProducts;
};

const convertB2BOrderDetails = (data: B2BOrderData, b3Lang: LangFormatFunction) => ({
  shippings: getOrderShipping(data),
  billings: getOrderBilling(data),
  history: data.orderHistoryEvent || [],
  poNumber: data.poNumber || '',
  status: data.status,
  statusCode: data.statusId,
  currencyCode: data.currencyCode,
  currency: data.money?.currency_token || '$',
  money: data.money,
  orderSummary: getOrderSummary(data, b3Lang),
  payment: getPaymentData(data),
  orderComments: data.customerMessage,
  products: handleProductQuantity(data),
  orderId: Number(data.id),
  customStatus: data.customStatus,
  ipStatus: Number(data.ipStatus) || 0, // 0: no invoice, 1,2: have invoice
  invoiceId: Number(data.invoiceId || 0),
  canReturn: data.canReturn,
  createdEmail: data.createdEmail,
  orderIsDigital: data.orderIsDigital,
  companyInfo: data.companyInfo,
});

export default convertB2BOrderDetails;
