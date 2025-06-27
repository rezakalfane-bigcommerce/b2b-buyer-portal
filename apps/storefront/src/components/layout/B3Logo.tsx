import { useContext } from 'react';
import { Box, ImageListItem } from '@mui/material';

import { STORE_DEFAULT_LOGO } from '@/constants';
import { useMobile } from '@/hooks';
import { GlobalContext } from '@/shared/global';
import { useAppSelector } from '@/store';

export default function B3Logo() {
  const {
    state: { logo },
  } = useContext(GlobalContext);
  // const customer = useAppSelector(({ company }) => company.customer);
  // const companyInfoName = useAppSelector(({ company }) => company.companyInfo.companyName);
  const companyInfoId = useAppSelector(({ company }) => company.companyInfo.id);

  let companyLogo = logo
  switch(companyInfoId) {
    case '8333329': companyLogo = 'https://store-g2rtbg88n2.mybigcommerce.com/content/retailco.png';
      break;
    case '8333327': companyLogo = 'https://store-g2rtbg88n2.mybigcommerce.com/content/bbros.png';
      break;
    case '8311697': companyLogo = 'https://s3-us-west-2.amazonaws.com/bundleb2b-v3.0-media-files-prod/logo-candcgroup_d3c2c167-a757-40b3-99b6-2fadd54b8a34.png';
      break;
    case '8333328': companyLogo = 'https://store-g2rtbg88n2.mybigcommerce.com/content/pubpartners.png';
      break;
  }

  const [isMobile] = useMobile();

  return (
    <Box
      sx={
        isMobile
          ? {
              height: '40px',
              width: '140px',
              '& li': {
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: '1rem',
              },
              '& img': {
                maxHeight: '40px',
              },
            }
          : {
              width: '200px',
              height: '65px',
              display: 'flex',
              alignItems: 'center',
              '& img': {
                maxHeight: '65px',
              },
            }
      }
    >
      <ImageListItem
        sx={{
          maxWidth: '200px',
          cursor: 'pointer',
          '& .MuiImageListItem-img': {
            objectFit: 'contain',
            width: 'auto',
          },
        }}
        onClick={() => {
          window.location.href = '/';
        }}
      >
        <img src={companyLogo || STORE_DEFAULT_LOGO} alt="logo" />
      </ImageListItem>
      {/* <ListItem sx={{minWidth: '300px', ml: 12}}>
        <Typography>{customer.companyRoleName} - {companyInfoName} ({companyInfoId})</Typography>
      </ListItem> */}
    </Box>
  );
}
