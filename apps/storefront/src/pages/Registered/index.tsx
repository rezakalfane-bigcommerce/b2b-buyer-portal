import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useB3Lang } from '@b3/lang';
import { Box, ImageListItem } from '@mui/material';

import { B3Card } from '@/components';
import B3Spin from '@/components/spin/B3Spin';
import { useMobile, useScrollBar } from '@/hooks';
import { CustomStyleContext } from '@/shared/customStyleButton';
import { GlobalContext } from '@/shared/global';
import {
  getB2BCountries,
  getBusinessFormFields,
  getPersonalFormFields,
} from '@/shared/service/b2b';
import { bcLogin } from '@/shared/service/bc';
import { themeFrameSelector, useAppSelector } from '@/store';
import { B3SStorage, loginJump } from '@/utils';
import b2bLogger from '@/utils/b3Logger';
import { getCurrentCustomerInfo } from '@/utils/loginInfo';

import { loginCheckout, LoginConfig } from '../Login/config';
import { type PageProps } from '../PageProps';

import { RegisteredContext } from './context/RegisteredContext';
import {
  AccountFormFieldsItems,
  b2bAddressRequiredFields,
  companyAttachmentsFields,
  getAccountFormFields,
  RegisterFieldsItems,
} from './config';
import RegisterContent from './RegisterContent';
import RegisteredStep from './RegisteredStep';
import { RegisteredContainer, RegisteredImage } from './styled';
import { RegisterFields } from './types';

function Registered(props: PageProps) {
  const { setOpenPage } = props;

  const [activeStep, setActiveStep] = useState(0);

  const b3Lang = useB3Lang();
  const [isMobile] = useMobile();

  const navigate = useNavigate();

  const IframeDocument = useAppSelector(themeFrameSelector);

  const {
    state: { isCheckout, isCloseGotoBCHome, logo, storeName, registerEnabled },
  } = useContext(GlobalContext);

  const {
    state: {
      isLoading,
      accountType,
      contactInformation = [],
      passwordInformation = [],
      bcPasswordInformation = [],
      bcContactInformation = [],
    },
    dispatch,
  } = useContext(RegisteredContext);

  const {
    state: {
      accountLoginRegistration,
      portalStyle: { backgroundColor = '#FEF9F5' },
    },
  } = useContext(CustomStyleContext);

  useEffect(() => {
    if (!registerEnabled) {
      navigate('/login');
    }
  }, [navigate, registerEnabled]);

  useEffect(() => {
    const getBCAdditionalFields = async () => {
      try {
        if (dispatch) {
          dispatch({
            type: 'loading',
            payload: {
              isLoading: true,
            },
          });
          dispatch({
            type: 'finishInfo',
            payload: {
              submitSuccess: false,
            },
          });
        }

        const [personalFormFields, businessFormFields, countries] = await Promise.all([
          getPersonalFormFields().then(getAccountFormFields),
          getBusinessFormFields()
            .then((fields) =>
              fields.map((field: AccountFormFieldsItems) => {
                if (
                  b2bAddressRequiredFields.includes(field?.fieldId || '') &&
                  field.groupId === 4
                ) {
                  field.isRequired = true;
                  field.visible = true;
                }

                return field;
              }),
            )
            .then(getAccountFormFields),
          getB2BCountries(),
        ]);

        const newAddressInformationFields =
          businessFormFields.address?.map(
            (addressFields: Partial<RegisterFieldsItems>): Partial<RegisterFieldsItems> => {
              if (addressFields.name === 'country') {
                addressFields.options = countries;
                addressFields.replaceOptions = {
                  label: 'countryName',
                  value: 'countryName',
                };
              }
              return addressFields;
            },
          ) || [];

        const newBCAddressInformationFields =
          personalFormFields.address?.map(
            (addressFields: Partial<RegisterFieldsItems>): Partial<RegisterFieldsItems> => {
              const addressFormFields = addressFields;
              if (addressFields.name === 'country') {
                addressFormFields.options = countries;
                const countryDefaultValue = countries.find(
                  (country: CustomFieldItems) => country.countryName === addressFields.default,
                );
                addressFormFields.default =
                  countryDefaultValue?.countryCode || addressFields.default;
              }
              return addressFields;
            },
          ) || [];
        // accountLoginRegistration
        const { b2b, b2c } = accountLoginRegistration;
        const accountB2cEnabledInfo = b2c && !b2b;

        if (dispatch) {
          dispatch({
            type: 'all',
            payload: {
              accountType: accountB2cEnabledInfo ? '2' : '1',
              isLoading: false,
              storeName,
              // account
              contactInformation: [...(businessFormFields.contactInformation || [])],
              bcContactInformation: [...(personalFormFields.contactInformation || [])],
              additionalInformation: [...(businessFormFields.additionalInformation || [])],
              bcAdditionalInformation: [...(personalFormFields.additionalInformation || [])],
              // detail
              companyExtraFields: [],
              companyInformation: [...(businessFormFields?.businessDetails || [])],
              companyAttachment: [...companyAttachmentsFields(b3Lang)],
              addressBasicFields: [...newAddressInformationFields],
              bcAddressBasicFields: [...newBCAddressInformationFields],
              countryList: [...countries],
              // password
              passwordInformation: [...(businessFormFields.password || [])],
              bcPasswordInformation: [...(personalFormFields.password || [])],
            },
          });
        }
      } catch (e) {
        b2bLogger.error(e);
      }
    };

    getBCAdditionalFields();
    // disabling as we only need to run this once and values at starting render are good enough
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getLoginData = () => {
    const emailAddress =
      ((accountType === '1' ? contactInformation : bcContactInformation).find(
        (field: RegisterFields) => field.name === 'email',
      )?.default as string) || '';

    const password =
      ((accountType === '1' ? passwordInformation : bcPasswordInformation).find(
        (field: RegisterFields) => field.name === 'password',
      )?.default as string) || '';

    return {
      emailAddress,
      password,
    };
  };
  const handleNext = async () => {
    setActiveStep((prevActiveStep: number) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep: number) => prevActiveStep - 1);
  };

  const clearRegisterInfo = () => {
    if (dispatch) {
      dispatch({
        type: 'all',
        payload: {
          accountType: '',
          isLoading: false,
          storeName: '',
          submitSuccess: false,
          contactInformation: [],
          additionalInformation: [],
          companyExtraFields: [],
          companyInformation: [],
          companyAttachment: [],
          addressBasicFields: [],
          addressExtraFields: [],
          countryList: [],
          passwordInformation: [],
        },
      });
    }
  };

  const handleFinish = async () => {
    dispatch({
      type: 'loading',
      payload: {
        isLoading: true,
      },
    });

    const data: LoginConfig = getLoginData();

    if (isCheckout) {
      try {
        await loginCheckout(data);
        window.location.reload();
      } catch (error) {
        b2bLogger.error(error);
      }
    } else {
      try {
        const getBCFieldsValue = {
          email: data.emailAddress,
          pass: data.password,
        };

        const { data: bcData } = await bcLogin(getBCFieldsValue);

        if (bcData?.login?.customer) {
          B3SStorage.set('loginCustomer', {
            emailAddress: bcData.login.customer.email,
            phoneNumber: bcData.login.customer.phone,
            ...bcData.login.customer,
          });
        }

        await getCurrentCustomerInfo();

        clearRegisterInfo();

        const isLoginLandLocation = loginJump(navigate);

        if (!isLoginLandLocation) return;

        if (isCloseGotoBCHome) {
          window.location.href = '/';
        } else {
          navigate('/orders');
        }
      } catch (error) {
        b2bLogger.error(error);
      }
    }

    dispatch({
      type: 'loading',
      payload: {
        isLoading: false,
      },
    });
  };

  useEffect(() => {
    IframeDocument?.body.scrollIntoView(true);
    // disabling as we only need to run this when activeStep changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStep]);

  useScrollBar(false);

  return (
    <B3Card setOpenPage={setOpenPage}>
      <RegisteredContainer isMobile={isMobile}>
        <B3Spin isSpinning={isLoading} tip={b3Lang('global.tips.loading')} transparency="0">
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              alignItems: 'center',
            }}
          >
            {logo && (
              <RegisteredImage>
                <ImageListItem
                  sx={{
                    maxWidth: '250px',
                  }}
                  onClick={() => {
                    window.location.href = '/';
                  }}
                >
                  <img src={logo} alt={b3Lang('global.tips.registerLogo')} loading="lazy" />
                </ImageListItem>
              </RegisteredImage>
            )}
            <RegisteredStep activeStep={activeStep} backgroundColor={backgroundColor}>
              <RegisterContent
                activeStep={activeStep}
                handleBack={handleBack}
                handleNext={handleNext}
                handleFinish={handleFinish}
              />
            </RegisteredStep>
          </Box>
        </B3Spin>
      </RegisteredContainer>
    </B3Card>
  );
}

export default Registered;
