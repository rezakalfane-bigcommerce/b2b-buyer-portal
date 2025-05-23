import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useB3Lang } from '@b3/lang';
import { Box } from '@mui/material';

import B3Filter from '@/components/filter/B3Filter';
import B3Spin from '@/components/spin/B3Spin';
import { B3PaginationTable, GetRequestList } from '@/components/table/B3PaginationTable';
import { useCardListColumn, useTableRef, useVerifyCreatePermission } from '@/hooks';
import { GlobalContext } from '@/shared/global';
import {
  getB2BAddress,
  getB2BAddressConfig,
  getB2BCountries,
  getBCCustomerAddress,
} from '@/shared/service/b2b';
import { isB2BUserSelector, useAppSelector } from '@/store';
import { CustomerRole } from '@/types';
import { b2bPermissionsMap, snackbar } from '@/utils';
import b2bLogger from '@/utils/b3Logger';

import { AddressConfigItem, AddressItemType, BCAddressItemType } from '../../types/address';

import B3AddressForm from './components/AddressForm';
import { AddressItemCard } from './components/AddressItemCard';
import DeleteAddressDialog from './components/DeleteAddressDialog';
import SetDefaultDialog from './components/SetDefaultDialog';
import { convertBCToB2BAddress, filterFormConfig } from './shared/config';
import { CountryProps, getAddressFields } from './shared/getAddressFields';

const permissionKeys = [
  b2bPermissionsMap.addressesCreateActionsPermission,
  b2bPermissionsMap.addressesUpdateActionsPermission,
  b2bPermissionsMap.addressesDeleteActionsPermission,
];
interface RefCurrentProps extends HTMLInputElement {
  handleOpenAddEditAddressClick: (type: string, data?: AddressItemType) => void;
}

type BCAddress = {
  node: BCAddressItemType;
};

interface FilterSearchProps {
  country?: string;
  state?: string;
  city?: string;
  search?: string;
}

function Address() {
  const isB2BUser = useAppSelector(isB2BUserSelector);
  const companyInfoId = useAppSelector(({ company }) => company.companyInfo.id);
  const role = useAppSelector(({ company }) => company.customer.role);
  const salesRepCompanyId = useAppSelector(({ b2bFeatures }) => b2bFeatures.masqueradeCompany.id);
  const isAgenting = useAppSelector(({ b2bFeatures }) => b2bFeatures.masqueradeCompany.isAgenting);
  const {
    state: { addressConfig },
    dispatch,
  } = useContext(GlobalContext);

  const { selectCompanyHierarchyId } = useAppSelector(
    ({ company }) => company.companyHierarchyInfo,
  );

  const b3Lang = useB3Lang();
  const isExtraLarge = useCardListColumn();
  const [paginationTableRef] = useTableRef();

  const addEditAddressRef = useRef<RefCurrentProps | null>(null);

  const [isRequestLoading, setIsRequestLoading] = useState(false);
  const [addressFields, setAddressFields] = useState<CustomFieldItems[]>([]);
  const [countries, setCountries] = useState<CountryProps[]>([]);
  const [filterData, setFilterData] = useState<Partial<FilterSearchProps>>({
    search: '',
  });

  const companyId =
    role === CustomerRole.SUPER_ADMIN && isAgenting ? salesRepCompanyId : companyInfoId;

  let isBCPermission = false;

  if (!isB2BUser || (role === CustomerRole.SUPER_ADMIN && !isAgenting)) {
    isBCPermission = true;
  }

  useEffect(() => {
    const handleGetAddressFields = async () => {
      const { countries } = await getB2BCountries();

      setCountries(countries);
      setIsRequestLoading(true);
      try {
        const addressFields = await getAddressFields(!isBCPermission, countries);
        setAddressFields(addressFields || []);
      } catch (err) {
        b2bLogger.error(err);
      } finally {
        setIsRequestLoading(false);
      }
    };

    handleGetAddressFields();
    // disabling as we only need to run this once and values at starting render are good enough
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const defaultParams: FilterSearchProps = {};
  const getAddressList: GetRequestList<FilterSearchProps, AddressItemType> = async (
    params = defaultParams,
  ) => {
    let list = [];
    let count = 0;

    if (!isBCPermission) {
      const {
        addresses: { edges: addressList = [], totalCount },
      } = await getB2BAddress({
        companyId,
        ...params,
      });

      list = addressList;
      count = totalCount;
    } else {
      const {
        customerAddresses: { edges: addressList = [], totalCount },
      } = await getBCCustomerAddress({
        ...params,
      });

      list = addressList.map((address: BCAddress) => ({
        node: convertBCToB2BAddress(address.node),
      }));
      count = totalCount;
    }

    return {
      edges: list,
      totalCount: count,
    };
  };

  const handleChange = (key: string, value: string) => {
    if (key === 'search') {
      setFilterData({
        ...filterData,
        search: value,
      });
    }
  };
  const handleFilterChange = (values: FilterSearchProps) => {
    setFilterData({
      ...filterData,
      country: values.country || '',
      state: values.state || '',
      city: values.city || '',
    });
  };

  const updateAddressList = () => {
    paginationTableRef.current?.refresh();
  };

  const [editPermission, setEditPermission] = useState(false);
  const [isOpenSetDefault, setIsOpenSetDefault] = useState(false);
  const [isOpenDelete, setIsOpenDelete] = useState(false);
  const [currentAddress, setCurrentAddress] = useState<AddressItemType>();

  const [isCreatePermission, updateActionsPermission, deleteActionsPermission] =
    useVerifyCreatePermission(permissionKeys);

  useEffect(() => {
    const getEditPermission = async () => {
      if (isBCPermission) {
        setEditPermission(true);
        return;
      }

      if (updateActionsPermission) {
        try {
          let configList = addressConfig;
          if (!configList) {
            const { addressConfig: newConfig } = await getB2BAddressConfig();
            configList = newConfig;

            dispatch({
              type: 'common',
              payload: {
                addressConfig: configList,
              },
            });
          }

          const key = role === 3 ? 'address_sales_rep' : 'address_admin';

          const editPermission =
            (configList || []).find((config: AddressConfigItem) => config.key === 'address_book')
              ?.isEnabled === '1' &&
            (configList || []).find((config: AddressConfigItem) => config.key === key)
              ?.isEnabled === '1';

          setEditPermission(editPermission);
        } catch (error) {
          b2bLogger.error(error);
        }
      }
    };
    getEditPermission();
    // Disabling the next line as dispatch is not required to be in the dependency array
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressConfig, updateActionsPermission, isBCPermission, role, selectCompanyHierarchyId]);

  const handleCreate = () => {
    if (!editPermission) {
      snackbar.error(b3Lang('addresses.noPermissionToAdd'));
      return;
    }
    addEditAddressRef.current?.handleOpenAddEditAddressClick('add');
  };

  const handleEdit = (row: AddressItemType) => {
    if (!editPermission) {
      snackbar.error(b3Lang('addresses.noPermissionToEdit'));
      return;
    }
    addEditAddressRef.current?.handleOpenAddEditAddressClick('edit', row);
  };

  const handleDelete = (address: AddressItemType) => {
    if (!editPermission) {
      snackbar.error(b3Lang('addresses.noPermissionToEdit'));
      return;
    }
    setCurrentAddress({
      ...address,
    });
    setIsOpenDelete(true);
  };

  const handleSetDefault = (address: AddressItemType) => {
    setCurrentAddress({
      ...address,
    });
    setIsOpenSetDefault(true);
  };

  const AddButtonConfig = useMemo(() => {
    return {
      isEnabled: isBCPermission || (editPermission && isCreatePermission),
      customLabel: b3Lang('addresses.addNewAddress'),
    };

    // ignore b3Lang due it's function that doesn't not depend on any reactive value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editPermission, selectCompanyHierarchyId, isCreatePermission]);

  const translatedFilterFormConfig = JSON.parse(JSON.stringify(filterFormConfig));

  translatedFilterFormConfig.map((element: { label: string; idLang: any }) => {
    const item = element;
    item.label = b3Lang(element.idLang);

    return element;
  });

  const currentUseCompanyHierarchyId = Number(selectCompanyHierarchyId) || Number(companyId);

  return (
    <B3Spin isSpinning={isRequestLoading}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
        }}
      >
        <B3Filter
          filterMoreInfo={translatedFilterFormConfig}
          handleChange={handleChange}
          handleFilterChange={handleFilterChange}
          customButtonConfig={AddButtonConfig}
          handleFilterCustomButtonClick={handleCreate}
        />
        <B3PaginationTable
          ref={paginationTableRef}
          columnItems={[]}
          rowsPerPageOptions={[12, 24, 36]}
          getRequestList={getAddressList}
          searchParams={filterData}
          isCustomRender
          itemXs={isExtraLarge ? 3 : 4}
          requestLoading={setIsRequestLoading}
          tableKey="id"
          renderItem={(row) => (
            <AddressItemCard
              key={row.id}
              item={row}
              onEdit={() => handleEdit(row)}
              onDelete={handleDelete}
              onSetDefault={handleSetDefault}
              editPermission={editPermission}
              updateActionsPermission={updateActionsPermission}
              deleteActionsPermission={deleteActionsPermission}
              isBCPermission={isBCPermission}
            />
          )}
        />
        <B3AddressForm
          updateAddressList={updateAddressList}
          addressFields={addressFields}
          ref={addEditAddressRef}
          companyId={currentUseCompanyHierarchyId}
          isBCPermission={isBCPermission}
          countries={countries}
        />

        {editPermission && !isBCPermission && (
          <SetDefaultDialog
            isOpen={isOpenSetDefault}
            setIsOpen={setIsOpenSetDefault}
            setIsLoading={setIsRequestLoading}
            addressData={currentAddress}
            updateAddressList={updateAddressList}
            companyId={currentUseCompanyHierarchyId}
          />
        )}
        {editPermission && (
          <DeleteAddressDialog
            isOpen={isOpenDelete}
            setIsOpen={setIsOpenDelete}
            setIsLoading={setIsRequestLoading}
            addressData={currentAddress}
            updateAddressList={updateAddressList}
            companyId={currentUseCompanyHierarchyId}
            isBCPermission={isBCPermission}
          />
        )}
      </Box>
    </B3Spin>
  );
}

export default Address;
