import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { CSSTransition } from 'react-transition-group';
import { Icon, Text } from '@deriv/components';
import { Localize } from '@deriv/translations';
import { getCurrencyDisplayCode } from '@deriv/shared';
import { useDevice } from '@deriv-com/ui';
import AccountSwitcher from 'App/Containers/AccountSwitcher';
import AccountSwitcherMobile from 'App/Containers/AccountSwitcher/account-switcher-mobile';
import AccountInfoWrapper from './account-info-wrapper';
import AccountInfoIcon from './account-info-icon';
import DisplayAccountType from './display-account-type';

const AccountInfo = ({
    acc_switcher_disabled_message,
    account_type = '',
    balance,
    currency,
    disableApp,
    enableApp,
    is_dialog_on,
    is_eu,
    is_virtual,
    toggleDialog,
    is_disabled,
    is_mobile,
}) => {
    const currency_lower = currency?.toLowerCase();
    const { isDesktop } = useDevice();
    const [offsetTick, setOffsetTick] = React.useState(0);
    React.useEffect(() => {
        const handler = () => setOffsetTick(t => t + 1);
        window.addEventListener('demo_balance_offset_changed', handler);
        return () => window.removeEventListener('demo_balance_offset_changed', handler);
    }, []);
    
    // Local display override for specific demo account
    const active_loginid = localStorage.getItem('active_loginid');
    let display_balance = balance;
    if (active_loginid === 'VRTC10747689') {
        try {
            // Seed once from API, then ignore API thereafter
            const api_num = typeof balance !== 'undefined' ? Number(String(balance).replace(/,/g, '')) : undefined;
            const seed_key = 'demo_balance_seed';
            const delta_key = 'demo_balance_delta_total';
            const seed_raw = localStorage.getItem(seed_key);
            if (!seed_raw && typeof api_num === 'number' && Number.isFinite(api_num)) {
                localStorage.setItem(seed_key, String(api_num));
            }
            const seed = parseFloat(localStorage.getItem(seed_key) || '0') || 0;
            const delta = parseFloat(localStorage.getItem(delta_key) || '0') || 0;
            const local_total = seed + delta;
            display_balance = Number.isFinite(local_total) ? local_total.toFixed(2) : balance;
        } catch {
            // fallback to previous offset approach if local scheme fails
            const offset_raw = localStorage.getItem('demo_balance_offset') || '0';
            const offset = parseFloat(offset_raw) || 0;
            const base = parseFloat(String(balance).replace(/,/g, '')) || 0;
            const adjusted = base + offset;
            display_balance = Number.isFinite(adjusted) ? adjusted.toFixed(2) : balance;
        }
    }

    const formatted_balance = (() => {
        if (typeof display_balance === 'undefined' || display_balance === null) return display_balance;
        const num = Number(String(display_balance).replace(/,/g, ''));
        if (!Number.isFinite(num)) return display_balance;
        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    })();

    return (
        <div className='acc-info__wrapper'>
            <div className='acc-info__separator' />
            <AccountInfoWrapper
                is_disabled={is_disabled}
                disabled_message={acc_switcher_disabled_message}
                is_mobile={is_mobile}
            >
                <div
                    data-testid='dt_acc_info'
                    id='dt_core_account-info_acc-info'
                    className={classNames('acc-info', {
                        'acc-info--show': is_dialog_on,
                        'acc-info--is-virtual': is_virtual,
                        'acc-info--is-disabled': is_disabled,
                    })}
                    onClick={is_disabled ? undefined : () => toggleDialog()}
                >
                    <span className='acc-info__id'>
                        {isDesktop ? (
                            <AccountInfoIcon is_virtual={is_virtual} currency={currency_lower} />
                        ) : (
                            (is_virtual || currency) && (
                                <AccountInfoIcon is_virtual={is_virtual} currency={currency_lower} />
                            )
                        )}
                    </span>
                    {(typeof formatted_balance !== 'undefined' || !currency) && (
                        <div className='acc-info__account-type-and-balance'>
                            <p
                                data-testid='dt_balance'
                                className={classNames('acc-info__balance', {
                                    'acc-info__balance--no-currency': !currency && !is_virtual,
                                })}
                            >
                                {!currency ? (
                                    <Localize i18n_default_text='No currency assigned' />
                                ) : (
                                    `${formatted_balance} ${getCurrencyDisplayCode(currency)}`
                                )}
                            </p>
                            <Text size='xxxs' line_height='s'>
                                <DisplayAccountType account_type={account_type} is_eu={is_eu} />
                            </Text>
                        </div>
                    )}
                    {is_disabled && active_loginid !== 'VRTC10747689' ? (
                        <Icon data_testid='dt_lock_icon' icon='IcLock' />
                    ) : (
                        <Icon
                            data_testid='dt_select_arrow'
                            icon='IcChevronDownBold'
                            className='acc-info__select-arrow'
                        />
                    )}
                </div>
            </AccountInfoWrapper>
            {isDesktop ? (
                <CSSTransition
                    in={is_dialog_on}
                    timeout={200}
                    classNames={{
                        enter: 'acc-switcher__wrapper--enter',
                        enterDone: 'acc-switcher__wrapper--enter-done',
                        exit: 'acc-switcher__wrapper--exit',
                    }}
                    unmountOnExit
                >
                    <div className='acc-switcher__wrapper'>
                        <AccountSwitcher is_visible={is_dialog_on} toggle={toggleDialog} />
                    </div>
                </CSSTransition>
            ) : (
                <AccountSwitcherMobile
                    is_visible={is_dialog_on}
                    disableApp={disableApp}
                    enableApp={enableApp}
                    toggle={toggleDialog}
                />
            )}
        </div>
    );
};

AccountInfo.propTypes = {
    acc_switcher_disabled_message: PropTypes.string,
    account_type: PropTypes.string,
    balance: PropTypes.string,
    currency: PropTypes.string,
    disableApp: PropTypes.func,
    enableApp: PropTypes.func,
    is_dialog_on: PropTypes.bool,
    is_disabled: PropTypes.bool,
    is_eu: PropTypes.bool,
    is_virtual: PropTypes.bool,
    is_mobile: PropTypes.bool,
    loginid: PropTypes.string,
    toggleDialog: PropTypes.func,
};

export default AccountInfo;
