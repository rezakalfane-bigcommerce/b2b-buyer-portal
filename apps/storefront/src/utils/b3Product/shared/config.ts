import { LangFormatFunction } from '@b3/lang';
import format from 'date-fns/format';
import isEmpty from 'lodash-es/isEmpty';

import {
  BcCalculatedPrice,
  CompanyInfoTypes,
  OptionValueProps,
  ShoppingListProductItem,
  ShoppingListSelectProductOption,
  SimpleObject,
} from '@/types';
import { AllOptionProps, ALlOptionValue, Product } from '@/types/products';
import b2bLogger from '@/utils/b3Logger';

export interface ShoppingListInfoProps {
  name: string;
  id: number | string;
  description: string;
  grandTotal: number | string;
  status: number | string;
  products: {
    totalCount: number | string;
  };
  customerInfo: CustomerInfoProps;
  isOwner: boolean;
  companyInfo: CompanyInfoTypes;
}

export interface CustomerInfoProps {
  email: string;
  firstName: string;
  lastName: string;
  userId: number | string;
}

interface ModifierPrices {
  adjuster: string;
  adjuster_value: number;
}

export interface ProductInfoProps {
  basePrice: number | string;
  baseSku: string;
  createdAt: number;
  discount: number | string;
  enteredInclusive: boolean;
  id: number | string;
  itemId: number;
  optionList: string;
  primaryImage: string;
  productId: number;
  productName: string;
  productUrl: string;
  quantity: number | string;
  tax: number | string;
  updatedAt: number;
  variantId: number;
  variantSku: string;
  productsSearch: CustomFieldItems;
  pickListIds?: number[];
  modifierPrices?: ModifierPrices[];
  baseAllPrice?: number | string;
  baseAllPriceTax?: number | string;
  currentProductPrices?: BcCalculatedPrice;
  extraProductPrices?: BcCalculatedPrice[];
  [key: string]: any;
}

export interface ListItemProps {
  node: ProductInfoProps;
}

export interface CurrencyProps {
  is_default: boolean;
  currency_code: string;
  token: string;
}

export interface SearchProps {
  search?: string;
  first?: number;
  offset?: number;
}

export interface ProductsProps {
  maxQuantity?: number;
  minQuantity?: number;
  stock?: number;
  isStock?: string;
  node: Partial<Product>;
  isValid?: boolean;
}

const fieldTypes: CustomFieldItems = {
  text: 'text',
  numbers_only_text: 'number',
  multi_line_text: 'multiline',
  date: 'date',
  checkbox: 'checkbox',
  radio_buttons: 'radio',
  dropdown: 'dropdown',
  rectangles: 'rectangle',
  file: 'files',
  swatch: 'swatch',
  product_list_with_images: 'productRadio',
  product_list: 'productRadio',
};

export const Base64 = {
  encode(str: string | number | boolean) {
    return window.btoa(encodeURIComponent(str));
  },
  decode(str: string) {
    return decodeURIComponent(window.atob(str));
  },
};

const getFieldOptions = (
  fieldType: string,
  option: Partial<AllOptionProps>,
  productImages: SimpleObject,
) => {
  const { option_values: optionValues = [], config, display_name: displayName } = option;

  if (fieldType === 'text') {
    const { text_max_length: maxLength } = config || {};

    return {
      maxLength: maxLength || undefined,
    };
  }

  if (fieldType === 'number') {
    const {
      number_lowest_value: lowest,
      number_limited: limitInput,
      number_highest_value: highest,
    } = config || {};
    return {
      min: limitInput ? lowest || undefined : undefined,
      max: limitInput ? highest || undefined : undefined,
      allowArrow: true,
    };
  }

  if (fieldType === 'multiline') {
    const { text_max_length: maxLength } = config || {};
    return {
      rows: 3,
      maxLength: maxLength || undefined,
    };
  }

  if (fieldType === 'date') {
    const { default_value: defaultValue } = config || {};

    return {
      default: defaultValue ? format(new Date(defaultValue), 'yyyy-MM-dd') : '',
    };
  }

  if (fieldType === 'checkbox') {
    const { checkbox_label: label, checked_by_default: checked } = config || {};

    const checkedId: number | string =
      optionValues.find((values) => values.label === 'Yes')?.id || optionValues[0]?.id || '';

    return {
      options: [
        {
          value: checkedId,
          label,
        },
      ],
      default: checked ? [checkedId] : [],
    };
  }

  if (['radio', 'productRadio', 'rectangle', 'swatch'].includes(fieldType)) {
    const options = (optionValues || []).map((item: Partial<ALlOptionValue>) => ({
      value: item.id,
      label: item.label,
      image: {
        data:
          fieldType === 'swatch'
            ? item.value_data?.image_url
            : productImages[item.value_data?.product_id || ''] || '',
        alt: fieldType === 'swatch' ? item.label : '',
      },
      colors: item.value_data?.colors || [],
    }));
    const value =
      (optionValues || []).find((item: Partial<ALlOptionValue>) => item.is_default)?.id || '';

    return {
      options,
      default: value,
    };
  }

  if (fieldType === 'dropdown') {
    const value =
      (optionValues || []).find((item: Partial<ALlOptionValue>) => item.is_default)?.id || '';

    return {
      options: optionValues,
      default: value,
      replaceOptions: {
        label: 'label',
        value: 'id',
      },
    };
  }

  if (fieldType === 'files') {
    const { file_max_size: fileSize } = config || {};

    return {
      filesLimit: 1,
      maxFileSize: fileSize,
      default: [],
      title: displayName,
    };
  }

  return undefined;
};

const getValueText = (
  fieldType: string,
  value: string | number | (string | number)[],
  option: Partial<AllOptionProps>,
) => {
  const { option_values: optionValues = [] } = option;
  if (['radio', 'productRadio', 'rectangle', 'swatch', 'dropdown'].includes(fieldType)) {
    return optionValues.find((option) => `${option.id}` === `${value}`)?.label || '';
  }

  if (fieldType === 'checkbox') {
    return `${value}` !== '' ? 'Yes' : '';
  }

  if (fieldType === 'files') {
    return '';
  }
  return value;
};

export const getProductOptionsFields = (
  product: ShoppingListProductItem,
  productImages: SimpleObject,
) => {
  const { allOptions = [] } = product || {};

  const list: CustomFieldItems[] = [];
  allOptions.forEach((option: Partial<AllOptionProps>) => {
    const {
      type,
      id,
      display_name: displayName,
      required,
      config: { default_value: defaultValue } = {},
      isVariantOption,
      option_values: optionValues = [],
    } = option;

    const fieldType = type ? fieldTypes[type] : '';

    if (!fieldType) return;

    const fieldOption = getFieldOptions(fieldType, option, productImages);

    let value = fieldOption?.default || defaultValue || '';

    try {
      const selectOptions =
        typeof product.selectOptions === 'string'
          ? JSON.parse(product.selectOptions || '')
          : product.selectOptions;

      let optionIdKey: 'option_id' | 'optionId' = 'option_id';
      let optionValueKey: 'option_value' | 'optionValue' = 'option_value';
      if (selectOptions.length > 0 && !selectOptions[0][optionIdKey]) {
        optionIdKey = 'optionId';
        optionValueKey = 'optionValue';
      }

      const selectOptionsJSON: {
        [key: string]: ShoppingListSelectProductOption;
      } = {};
      selectOptions.forEach((item: ShoppingListSelectProductOption) => {
        selectOptionsJSON[item[optionIdKey]] = item;
      });

      if (fieldType === 'checkbox') {
        const optionValue = (selectOptionsJSON[`attribute[${id}]`] || {})[optionValueKey] || '';

        const checkedId: number | string =
          optionValues.find((values) => values.label === 'Yes')?.id || optionValues[0]?.id || '';
        value = optionValue === '1' || optionValue.includes(`${checkedId}`) ? [checkedId] : value;
      } else if (fieldType !== 'date') {
        value = (selectOptionsJSON[`attribute[${id}]`] || {})[optionValueKey] || value || '';
      } else {
        const year = (selectOptionsJSON[`attribute[${id}][year]`] || {})[optionValueKey] || '';
        const month = (selectOptionsJSON[`attribute[${id}][month]`] || {})[optionValueKey] || '';
        const day = (selectOptionsJSON[`attribute[${id}][day]`] || {})[optionValueKey] || '';
        const date = year && month && day ? `${year}-${month}-${day}` : '';

        value = date ? format(new Date(date), 'yyyy-MM-dd') || value : value;
      }
    } catch (err) {
      b2bLogger.error(err);
    }

    if (fieldType === 'files') {
      value = value || [];
    }

    list.push({
      name: Base64.encode(`attribute[${id}]`),
      label: displayName,
      required,
      xs: 12,
      variant: 'filled',
      size: 'small',
      fieldType,
      isVariantOption,
      ...fieldOption,
      default: value,
      valueLabel: displayName,
      valueText: getValueText(fieldType, value, option),
      optionId: id,
      optionValue: value ? value.toString() : '',
      fieldOriginType: type,
    });
  });

  return list;
};

export const getAllModifierDefaultValue = (modifiers: CustomFieldItems) => {
  const modifierDefaultValue: CustomFieldItems = [];

  modifiers.forEach((modifier: CustomFieldItems) => {
    const {
      id: modifierId,
      type,
      display_name: displayName,
      config,
      required,
      option_values: optionValues,
    } = modifier;

    const modifierInfo = {
      option_id: modifierId,
      type,
      displayName,
      required,
      defaultValue: config?.default_value || '',
      isVerified: required ? (config?.default_value || '').toString().length > 0 : true,
    };

    if (['checkbox', 'rectangles', 'swatch', 'radio-buttons', 'dropdown'].includes(type)) {
      const defaultInfo = optionValues.find((values: CustomFieldItems) => values.is_default) || {};

      modifierInfo.defaultValue = defaultInfo?.id || '';

      if (required) {
        if (type === 'checkbox') {
          modifierInfo.isVerified = defaultInfo?.value_data?.checked_value || false;
        } else {
          modifierInfo.isVerified = modifierInfo.defaultValue.toString().length > 0;
        }
      }
    }

    if (type.includes('product_list')) {
      const defaultInfo = optionValues.find((values: CustomFieldItems) => values.is_default) || {};

      modifierInfo.defaultValue = defaultInfo?.id || '';

      if (required) {
        modifierInfo.isVerified = modifierInfo.defaultValue.toString().length > 0;
      }
    }

    if (type === 'file') {
      modifierInfo.defaultValue = '';

      if (required) {
        modifierInfo.isVerified = false;
      }
    }

    if (type === 'date') {
      const { default_value: defaultValue } = config || {};

      if (defaultValue && defaultValue?.length > 0) {
        const date = new Date(defaultValue);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();

        modifierInfo.defaultValue = {
          month,
          day,
          year,
        };
      }

      if (required) {
        modifierInfo.isVerified = !isEmpty(modifierInfo.defaultValue);
      }
    }

    modifierDefaultValue.push(modifierInfo);
  });

  return modifierDefaultValue;
};

export const conversionProductsList = (products: Product[], listProduct: ListItemProps[] = []) =>
  products.map((product) => {
    const optionsV3 = product.optionsV3 || [];
    const modifiers = product.modifiers || [];
    const variants = product.variants || [];

    const variantOptions = optionsV3.map((option) => ({
      ...option,
      required: true,
      isVariantOption: true,
    }));

    let price = variants[0]?.calculated_price || 0;
    variants.forEach((variant) => {
      price = Math.min(variant.calculated_price || 0, price);
    });

    const selectOptions =
      listProduct.find((item) => item.node.productId === product.id)?.node.optionList || '[]';

    return {
      ...product,
      quantity: 1,
      base_price: `${price}`,
      optionsV3,
      options: product.options || [],
      variants,
      modifiers,
      selectOptions,
      allOptions: [...variantOptions, ...modifiers],
    };
  });

export const getOptionRequestData = (
  formFields: CustomFieldItems[],
  data: CustomFieldItems,
  value: CustomFieldItems,
) => {
  const requestData = data;
  formFields.forEach((item: CustomFieldItems) => {
    const { fieldType, name } = item;

    const decodeName = Base64.decode(name);
    const fieldValue = value[name];

    if (fieldType === 'files') {
      return;
    }

    if (fieldType === 'number') {
      requestData[decodeName] = parseFloat(fieldValue) || '';
      return;
    }

    if (['radio', 'dropdown', 'rectangle', 'swatch', 'productRadio'].includes(fieldType)) {
      requestData[decodeName] = parseInt(fieldValue, 10) || '';
      return;
    }

    if (fieldType === 'checkbox') {
      requestData[decodeName] = fieldValue?.length > 0 ? fieldValue[0] : '';
      return;
    }

    if (fieldType === 'date') {
      if (!fieldValue) {
        return;
      }

      const date = new Date(fieldValue);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();

      requestData[`${decodeName}[month]`] = month;
      requestData[`${decodeName}[day]`] = day;
      requestData[`${decodeName}[year]`] = year;
      return;
    }

    requestData[decodeName] = fieldValue;
  });

  return requestData;
};

export const getQuickAddRowFields = (name: string | number, b3Lang: LangFormatFunction) => [
  {
    name: `sku-${name}`,
    label: b3Lang('global.searchProductAddProduct.sku') || 'SKU#',
    required: false,
    xs: 8,
    variant: 'filled',
    size: 'small',
    fieldType: 'text',
    default: '',
  },
  {
    name: `qty-${name}`,
    label: b3Lang('global.searchProductAddProduct.qty') || 'Qty',
    required: false,
    xs: 4,
    variant: 'filled',
    size: 'small',
    fieldType: 'number',
    default: '',
    allowArrow: true,
    min: 1,
    max: 1000000,
  },
];

interface OptionListProps {
  option_id: string;
  option_value: string;
}

interface AllOptionsProps {
  id: string | number;
  type: string;
}

export const addLineItems = (products: ProductsProps[]) => {
  const lineItems = products.map((item: ProductsProps) => {
    const { node } = item;

    const optionList: OptionListProps[] = JSON.parse(node.optionList || '[]');

    const getOptionId = (id: number | string) => {
      if (typeof id === 'number') return id;
      if (id.includes('attribute')) return Number(id.split('[')[1].split(']')[0]);
      return Number(id);
    };

    const {
      productsSearch: { allOptions },
    } = node;

    const optionValue: OptionValueProps[] = [];

    allOptions.forEach((item: AllOptionsProps) => {
      const splicedId = `attribute[${item.id}]`;

      if (item.type === 'date') {
        let month = '';
        let day = '';
        let year = '';
        optionList.forEach((list: OptionListProps) => {
          if (list.option_id === `${splicedId}[month]`) {
            month = list.option_value;
          }
          if (list.option_id === `${splicedId}[day]`) {
            day = list.option_value;
          }
          if (list.option_id === `${splicedId}[year]`) {
            year = list.option_value;
          }
        });

        if (month && day && year) {
          optionValue.push({
            optionId: getOptionId(item.id),
            optionValue: {
              day,
              month,
              year,
            },
          });
        }
      } else {
        const listItem = optionList.find((list: OptionListProps) => list.option_id === splicedId);
        if (listItem && listItem?.option_value) {
          optionValue.push({
            optionId: getOptionId(listItem.option_id),
            optionValue: listItem.option_value,
          });
        }
      }
    });

    return {
      quantity: node.quantity,
      productId: node.productId,
      variantId: node.variantId,
      optionSelections: optionValue,
      allOptions,
    };
  });

  return lineItems;
};
