import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useB3Lang } from '@b3/lang';
import { Box, Stack } from '@mui/material';
import trim from 'lodash-es/trim';
import CustomButton from '@/components/button/CustomButton';
import B3Spin from '@/components/spin/B3Spin';
import useStorageState from '@/hooks/useStorageState';
import { CustomStyleContext } from '@/shared/customStyleButton';
import {
  checkUserBCEmail,
  checkUserEmail,
  getB2BAccountFormFields,
  getB2BAccountSettings,
  getBCAccountSettings,
} from '@/shared/service/b2b';
import { isB2BUserSelector, useAppSelector } from '@/store';
import { Fields, ParamProps } from '@/types/accountSetting';
import { channelId, snackbar } from '@/utils';
import { getAccountFormFields } from '../Registered/config';
import { getAccountSettingsFields, getPasswordModifiedFields } from './config';
import { initB2BInfo, initBcInfo } from './utils';
import B3Request from '@/shared/service/request/b3Fetch';

function useData() {
  const isB2BUser = useAppSelector(isB2BUserSelector);
  const companyInfoId = useAppSelector(({ company }) => company.companyInfo.id);
  const customer = useAppSelector(({ company }) => company.customer);
  const role = useAppSelector(({ company }) => company.customer.role);
  const salesRepCompanyId = useAppSelector(({ b2bFeatures }) => b2bFeatures.masqueradeCompany.id);
  const isAgenting = useAppSelector(({ b2bFeatures }) => b2bFeatures.masqueradeCompany.isAgenting);
  const companyId = role === 3 && isAgenting ? Number(salesRepCompanyId) : Number(companyInfoId);
  const isBCUser = !isB2BUser || (role === 3 && !isAgenting);

  const validateEmailValue = async (emailValue: string) => {
    if (customer.emailAddress === trim(emailValue)) return true;
    const payload = {
      email: emailValue,
      channelId,
    };

    const { isValid }: { isValid: boolean } = isBCUser
      ? await checkUserBCEmail(payload)
      : await checkUserEmail(payload);

    return isValid;
  };

  const emailValidation = (data: Partial<ParamProps>) => {
    if (data.email !== customer.emailAddress && !data.currentPassword) {
      return false;
    }

    return true;
  };

  const passwordValidation = (data: Partial<ParamProps>) => {
    if (data.password !== data.confirmPassword) {
      return false;
    }

    return true;
  };

  return { isBCUser, companyId, customer, validateEmailValue, emailValidation, passwordValidation };
}

function AccountSetting() {
  const { isBCUser, companyId } =
    useData();

  const [isFinishUpdate, setIsFinishUpdate] = useStorageState<boolean>(
    'sf-isFinishUpdate',
    false,
    sessionStorage,
  );

  const {
    state: {
      portalStyle: { backgroundColor = '#FEF9F5' },
    },
  } = useContext(CustomStyleContext);

  const b3Lang = useB3Lang();
  const navigate = useNavigate();

  const [isLoading, setLoading] = useState<boolean>(false);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [salesStaff, setSalesStaff] = useState<any[]>([]);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const fn = isBCUser ? getBCAccountSettings : getB2BAccountSettings;
        const params = isBCUser ? {} : { companyId };
        const key = isBCUser ? 'customerAccountSettings' : 'accountSettings';
        const accountFormAllFields = await getB2BAccountFormFields(isBCUser ? 1 : 2);
        const accountFormFields = getAccountFormFields(accountFormAllFields.accountFormFields || []);
        const contactInformation = (accountFormFields?.contactInformation || []).filter(
          (item: Partial<Fields>) => item.fieldId !== 'field_email_marketing_newsletter',
        );
        const { additionalInformation = [] } = accountFormFields;
        const { [key]: accountSettings } = await fn(params);
        const fields = isBCUser
          ? initBcInfo(accountSettings, contactInformation, additionalInformation)
          : initB2BInfo(accountSettings, contactInformation, getAccountSettingsFields(), additionalInformation);
        const passwordModifiedFields = getPasswordModifiedFields();
        const all = [...fields, ...passwordModifiedFields];
        const roleItem = all.find((item) => item.name === 'role');
        if (roleItem?.fieldType) roleItem.fieldType = 'text';

        // --- NEW: Fetch sales staff
        const { data: salesList = [] } = await B3Request.get(`/api/v3/io/sales-staffs`, "B2BEditionRest", { companyId });
        if (salesList.length > 0) {
          const fullSalesData = await Promise.all(
            salesList.map((staff: { id: number }) =>
              B3Request.get(`/api/v3/io/sales-staffs/${staff.id}`, "B2BEditionRest"),
            ),
          );
          setSalesStaff(fullSalesData.map((res) => res.data));
        }
      } finally {
        if (isFinishUpdate) {
          snackbar.success(b3Lang('accountSettings.notification.detailsUpdated'));
          setIsFinishUpdate(false);
        }
        setLoading(false);
        setIsVisible(true);
      }
    };

    init();
    // disabling as we only need to run this once and values at starting render are good enough
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <B3Spin isSpinning={isLoading} background={backgroundColor}>
      {isVisible && (
        <Box mt={4}>
          {salesStaff.length === 0 ? (
            <CustomButton variant="outlined" fullWidth onClick={() => navigate('/quote')}>
              Request Sales Assistance
            </CustomButton>
          ) : (
            <Stack direction={'row'}>
              {salesStaff.map((rep) => (
                <Box
                  key={rep.id}
                  sx={{
                    p: 2,
                    m: 2,
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    backgroundColor: '#fff',
                  }}
                >
                  <Box fontWeight="bold">{rep.name}</Box>
                  <Box>Email: {rep.email}</Box>
                  <Box>Phone: {rep.phoneNumber}</Box>
                </Box>
              ))}
            </Stack>
          )}
        </Box>
      )}
    </B3Spin>
  );
}

export default AccountSetting;
