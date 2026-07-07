
    "get": [
        "learnlesson",
        "abusereport",
        "affiliatecommissionpayout",
        "aiquestion",
        "appgallerysubmission",
        "applicationmetadata",
        "supportarticle",
        "bootcamp",
        "bootcampsession",
        "bootcampticket",
        "zsupportinquiry",
        "zcertificationsignup",
        "coachingsession",
        "contributorpayout",
        "credittransaction",
        "debug",
        "featurerequest",
        "fileupload",
        "invoice",
        "zenterpriseprice",
        "organization",
        "perkactivation",
        "perkprogram",
        "plugincommissionitem",
        "plugincommissionpayout",
        "plugin",
        "rfp",
        "rfpagencysuggestion",
        "salescontactsubmission",
        "template",
        "templatecommissionitem",
        "templatecommissionpayout",
        "coachingcommissionpayout",
        "buildguidedatatype",
        "buildguide",
        "buildguidestep",
        "academylesson",
        "workloadcredit",
        "user"
    ],
    "post": [
        {
            "endpoint": "add_uploaded_file",
            "parameters": [
                {
                    "key": "appname",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "app_version",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "s3_key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "size",
                    "value": "number",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "attach_to",
                    "value": "text",
                    "optional": true,
                    "param_in": "body"
                },
                {
                    "key": "temp_db",
                    "value": "text",
                    "optional": true,
                    "param_in": "body"
                },
                {
                    "key": "content_type",
                    "value": "text",
                    "optional": true,
                    "param_in": "body"
                },
                {
                    "key": "date",
                    "value": "date",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "filename",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "user_id",
                    "value": "text",
                    "optional": true,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {}
        },
        {
            "endpoint": "delete_uploaded_file",
            "parameters": [
                {
                    "key": "appname",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "app_version",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "s3_key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "temp_db",
                    "value": "text",
                    "optional": true,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {}
        },
        {
            "endpoint": "delete_app_file_uploads",
            "parameters": [
                {
                    "key": "appname",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "app_version",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "app_deleted_id",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "temp_db",
                    "value": "text",
                    "optional": true,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {}
        },
        {
            "endpoint": "get-user-info",
            "parameters": [
                {
                    "key": "email",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "auth_key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {
                "bubble-user": "text",
                "stripe-customer-id": "text",
                "email-confirmed": "boolean",
                "agency-member": "boolean",
                "enterprise-member": "boolean",
                "forum-username": "text",
                "tsm-account-link": "text",
                "previous-credits": "number",
                "experiment-groups": "list.text",
                "bad-actor": "boolean"
            }
        },
        {
            "endpoint": "success-get-app-info",
            "parameters": [
                {
                    "key": "App_ID",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "auth_key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {
                "Plan": "text",
                "Frequency": "text",
                "Creation Date": "date",
                "Next Billing Date": "date",
                "Subscription ID": "text",
                "Capacity": "number",
                "Status": "text",
                "Paying User ID": "text",
                "Domain": "text",
                "Current Month Visitors": "number",
                "12 Months Visitors": "number",
                "Last changed": "date",
                "Template": "boolean",
                "Name": "text",
                "admin": "list.text"
            }
        },
        {
            "endpoint": "uploaded_file_total_size",
            "parameters": [
                {
                    "key": "appname",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "creation_date",
                    "value": "date",
                    "optional": true,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {
                "size": "number"
            }
        },
        {
            "endpoint": "credit_balance_adjust",
            "parameters": [
                {
                    "key": "source",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "user_id",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "adjustment_amount",
                    "value": "number",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "invoice_id",
                    "value": "text",
                    "optional": true,
                    "param_in": "body"
                },
                {
                    "key": "perk_program",
                    "value": "custom.perkprogram",
                    "optional": true,
                    "param_in": "body"
                },
                {
                    "key": "auth_key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {}
        },
        {
            "endpoint": "add_plugin_anrok",
            "parameters": [
                {
                    "key": "integrationId",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "sourceId",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "targetId",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {}
        },
        {
            "endpoint": "new_sales_lead",
            "parameters": [
                {
                    "key": "ref",
                    "value": "text",
                    "optional": true,
                    "param_in": "body"
                },
                {
                    "key": "agency_name",
                    "value": "text",
                    "optional": true,
                    "param_in": "body"
                },
                {
                    "key": "agency_tier",
                    "value": "text",
                    "optional": true,
                    "param_in": "body"
                },
                {
                    "key": "organization",
                    "value": "custom.organization",
                    "optional": true,
                    "param_in": "body"
                },
                {
                    "key": "company_name",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "company_size",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "country",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "email",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "job_title",
                    "value": "text",
                    "optional": true,
                    "param_in": "body"
                },
                {
                    "key": "first_name",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "last_name",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "message",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "source",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "customer_id",
                    "value": "text",
                    "optional": true,
                    "param_in": "body"
                },
                {
                    "key": "logged_in_user_email",
                    "value": "text",
                    "optional": true,
                    "param_in": "body"
                },
                {
                    "key": "full_url",
                    "value": "text",
                    "optional": true,
                    "param_in": "body"
                },
                {
                    "key": "utm_source",
                    "value": "text",
                    "optional": true,
                    "param_in": "body"
                },
                {
                    "key": "utm_medium",
                    "value": "text",
                    "optional": true,
                    "param_in": "body"
                },
                {
                    "key": "utm_campaign",
                    "value": "text",
                    "optional": true,
                    "param_in": "body"
                },
                {
                    "key": "phone",
                    "value": "text",
                    "optional": true,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {}
        },
        {
            "endpoint": "rfp_copy_emails",
            "parameters": [
                {
                    "key": "RFP",
                    "value": "custom.rfp",
                    "optional": false,
                    "param_in": "query"
                },
                {
                    "key": "Bid",
                    "value": "custom.rfpbid",
                    "optional": false,
                    "param_in": "query"
                },
                {
                    "key": "Agency",
                    "value": "custom.organization",
                    "optional": false,
                    "param_in": "query"
                },
                {
                    "key": "key",
                    "value": "text",
                    "optional": false,
                    "param_in": "query"
                }
            ],
            "method": "get",
            "auth_unecessary": false,
            "return_btype": {
                "Emails": "list.text"
            }
        },
        {
            "endpoint": "trial_concluded",
            "parameters": [
                {
                    "key": "id",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": true,
            "return_btype": {}
        },
        {
            "endpoint": "delete_uploaded_files",
            "parameters": [
                {
                    "key": "appname",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "app_version",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "s3_keys",
                    "value": "list.text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "temp_db",
                    "value": "text",
                    "optional": true,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {
                "deleted": "list.custom.fileupload"
            }
        },
        {
            "endpoint": "sso-su",
            "parameters": [
                {
                    "key": "Email",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {
                "Requires SSO": "boolean"
            }
        },
        {
            "endpoint": "sso-li",
            "parameters": [
                {
                    "key": "Email",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {
                "Requires SSO?": "boolean",
                "Member?": "boolean"
            }
        },
        {
            "endpoint": "sso-pre",
            "parameters": [
                {
                    "key": "Email",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {
                "Requires SSO?": "boolean",
                "Member?": "boolean",
                "Org name": "text",
                "Org ID": "text",
                "WorkOS ID": "text",
                "Bubble User?": "boolean",
                "Initialize?": "boolean",
                "Blocked?": "boolean"
            }
        },
        {
            "endpoint": "userInfo",
            "parameters": [],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {
                "_id": "text",
                "email": "text",
                "first_name_text": "text",
                "last_name_text": "text"
            }
        },
        {
            "endpoint": "agency-contribution_counts",
            "parameters": [
                {
                    "key": "Agency",
                    "value": "custom.organization",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {
                "Templates": "number",
                "Plugins": "number",
                "Certificates": "number",
                "Contributor": "text"
            }
        },
        {
            "endpoint": "certificate-userdetails",
            "parameters": [
                {
                    "key": "Certificate",
                    "value": "custom.bubblecertificate",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {
                "First name": "text",
                "Last name": "text",
                "Initials": "text",
                "Photo": "image",
                "ID": "text"
            }
        },
        {
            "endpoint": "hopin-webhook",
            "parameters": [
                {
                    "key": "_wf_request_data",
                    "value": "api_wf_data.cnfeC2",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": true,
            "return_btype": {}
        },
        {
            "endpoint": "fin_get_hmac",
            "parameters": [
                {
                    "key": "unique_id",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "auth_key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {
                "hmac": "text"
            }
        },
        {
            "endpoint": "perk_check_code",
            "parameters": [
                {
                    "key": "code",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {
                "exists?": "boolean"
            }
        },
        {
            "endpoint": "preferencecenter-status",
            "parameters": [
                {
                    "key": "Email",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {
                "Bubble account?": "boolean",
                "Agency?": "boolean",
                "Agency admin?": "boolean"
            }
        },
        {
            "endpoint": "new-partnership-request",
            "parameters": [
                {
                    "key": "Name",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Email",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Business",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Website",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Address",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Partnership type",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Interest",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Date",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Source",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Org type",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {}
        },
        {
            "endpoint": "st-router",
            "parameters": [
                {
                    "key": "id",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "type",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": true,
            "return_btype": {}
        },
        {
            "endpoint": "aibot-get-user-apps",
            "parameters": [
                {
                    "key": "Email",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Workflow_Triggered",
                    "value": "option.bot_workflows",
                    "optional": true,
                    "param_in": "body"
                },
                {
                    "key": "auth_key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": "text"
        },
        {
            "endpoint": "certificate-agencydetails",
            "parameters": [
                {
                    "key": "User",
                    "value": "user",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {
                "Visible in directory?": "boolean"
            }
        },
        {
            "endpoint": "aibot-user-soft-delete",
            "parameters": [
                {
                    "key": "User_Email",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Conversation_ID",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "auth_key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": "text"
        },
        {
            "endpoint": "parse-features",
            "parameters": [
                {
                    "key": "_wf_request_data",
                    "value": "api_wf_data.coGLy0",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": "text"
        },
        {
            "endpoint": "parse-steps",
            "parameters": [
                {
                    "key": "_wf_request_data",
                    "value": "api_wf_data.coGMI0",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": "text"
        },
        {
            "endpoint": "parse-types",
            "parameters": [
                {
                    "key": "_wf_request_data",
                    "value": "api_wf_data.coGMP0",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": "text"
        },
        {
            "endpoint": "sales-adjacent",
            "parameters": [
                {
                    "key": "email",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "subscription_id",
                    "value": "text",
                    "optional": true,
                    "param_in": "body"
                },
                {
                    "key": "customer_id",
                    "value": "text",
                    "optional": true,
                    "param_in": "body"
                },
                {
                    "key": "key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": true,
            "return_btype": {
                "custom-pricing?": "boolean",
                "enterprise?": "boolean",
                "dedicated?": "boolean",
                "sales-adjacent?": "boolean"
            }
        },
        {
            "endpoint": "aibot-issue-coupon",
            "parameters": [
                {
                    "key": "User_Email",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Discount_ID",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Conversation_ID",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "auth_key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": "text"
        },
        {
            "endpoint": "aibot-discount-logs-update",
            "parameters": [
                {
                    "key": "email",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "success-chat-log",
                    "value": "custom.successchatlogs",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "discount_ID",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "auth_key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {}
        },
        {
            "endpoint": "agency-add-user",
            "parameters": [
                {
                    "key": "Email",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Agency",
                    "value": "custom.organization",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "role",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "admin?",
                    "value": "boolean",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "rfp?",
                    "value": "boolean",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {
                "user ID": "text"
            }
        },
        {
            "endpoint": "invoice_overage_billing",
            "parameters": [
                {
                    "key": "appname",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "month",
                    "value": "number",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "year",
                    "value": "number",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "monthly_workload_used",
                    "value": "number",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "monthly_workload_overage_total_price",
                    "value": "number",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "monthly_workload_overage_rate",
                    "value": "number",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "monthly_workload_threshold",
                    "value": "number",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "paying_user_id",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "subscription_id",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {}
        },
        {
            "endpoint": "certification_return_stripe_id",
            "parameters": [
                {
                    "key": "user_meta_id",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {
                "stripe_customer_id": "text"
            }
        },
        {
            "endpoint": "certification_user_exists",
            "parameters": [
                {
                    "key": "email",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": true,
            "return_btype": {
                "uid": "text"
            }
        },
        {
            "endpoint": "certification_invoice_link",
            "parameters": [
                {
                    "key": "charge_id",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {
                "invoice_url": "text"
            }
        },
        {
            "endpoint": "certificate_return_link",
            "parameters": [
                {
                    "key": "enrollment_id",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {
                "certificate_url": "text"
            }
        },
        {
            "endpoint": "certification_attempt_complete",
            "parameters": [
                {
                    "key": "enrollment_id",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "user_meta_id",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "start_time",
                    "value": "date",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "completion_time",
                    "value": "date",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "attempt_number",
                    "value": "number",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "attempts_remaining",
                    "value": "number",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "passed",
                    "value": "boolean",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "certificate_expiration_date",
                    "value": "date",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "exam_id",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "enrollment_source",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": true,
            "return_btype": {}
        },
        {
            "endpoint": "certification_enrollment_assign",
            "parameters": [
                {
                    "key": "key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "enrollment_id",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "expiration_date",
                    "value": "date",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "user_meta_id",
                    "value": "text",
                    "optional": true,
                    "param_in": "body"
                },
                {
                    "key": "exam_id",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "old_user_meta_id",
                    "value": "text",
                    "optional": true,
                    "param_in": "body"
                },
                {
                    "key": "enrollment_source",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": true,
            "return_btype": {}
        },
        {
            "endpoint": "certification_enrollment_expiration",
            "parameters": [
                {
                    "key": "enrollment_id",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "expiration_date",
                    "value": "date",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "user_meta_id",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "exam_id",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": true,
            "return_btype": {}
        },
        {
            "endpoint": "certificate_transfer",
            "parameters": [
                {
                    "key": "key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "enrollment_id",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "user_meta_id",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "old_user_meta_id",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "enrollment_source",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": true,
            "return_btype": {}
        },
        {
            "endpoint": "intercom-userapps-initialize",
            "parameters": [
                {
                    "key": "_wf_request_data",
                    "value": "api_wf_data.coRnY7",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": "text"
        },
        {
            "endpoint": "intercom-userapps-submit",
            "parameters": [
                {
                    "key": "_wf_request_data",
                    "value": "api_wf_data.coRng7",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": "text"
        },
        {
            "endpoint": "certification_return_user_name",
            "parameters": [
                {
                    "key": "email",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": true,
            "return_btype": {
                "first": "text",
                "last": "text"
            }
        },
        {
            "endpoint": "certification_set_user_name",
            "parameters": [
                {
                    "key": "email",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "first",
                    "value": "text",
                    "optional": true,
                    "param_in": "body"
                },
                {
                    "key": "last",
                    "value": "text",
                    "optional": true,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": true,
            "return_btype": {}
        },
        {
            "endpoint": "aibot-retrieve-ideas",
            "parameters": [
                {
                    "key": "Query",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "User_ID",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "auth_key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": "text"
        },
        {
            "endpoint": "aibot-upvote-idea",
            "parameters": [
                {
                    "key": "Idea_Unique_ID",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "User_Email",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Conversation_ID",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "auth_key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": "text"
        },
        {
            "endpoint": "certification-bundle-eligible",
            "parameters": [
                {
                    "key": "email",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "organization",
                    "value": "custom.organization",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {
                "eligible?": "boolean"
            }
        },
        {
            "endpoint": "aibot-issue-credit",
            "parameters": [
                {
                    "key": "User_Email",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Amount",
                    "value": "number",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Conversation_ID",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Invoice_ID",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "auth_key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {}
        },
        {
            "endpoint": "certification_log_user_out",
            "parameters": [],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {
                "success": "boolean"
            }
        },
        {
            "endpoint": "aibot-cancel-then-credits",
            "parameters": [
                {
                    "key": "User_Email",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "App_ID",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Conversation_ID",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Credit_Amount",
                    "value": "number",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Invoice_ID",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "auth_key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {}
        },
        {
            "endpoint": "notification-failed-payment",
            "parameters": [
                {
                    "key": "Email",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "event_id",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "auth_key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {}
        },
        {
            "endpoint": "cancel-subscriptions-all",
            "parameters": [
                {
                    "key": "User_Email",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Conversation_ID",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "auth_key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "immediate_cancellation",
                    "value": "boolean",
                    "optional": true,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {}
        },
        {
            "endpoint": "app-access-override",
            "parameters": [
                {
                    "key": "App_ID",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Auth_Key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {}
        },
        {
            "endpoint": "parse-idea",
            "parameters": [
                {
                    "key": "User idea",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Source",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "User",
                    "value": "user",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {
                "Invalid idea?": "boolean",
                "Unsupported idea?": "boolean",
                "Suggested idea": "text",
                "OpenAI error?": "boolean"
            }
        },
        {
            "endpoint": "get_ashby_jobs_1",
            "parameters": [],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {
                "response": "list.api.apiconnector2.coadQ16.coadS16.results"
            }
        },
        {
            "endpoint": "get_ashby_jobs_2",
            "parameters": [],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {
                "response": "list.api.apiconnector2.coadQ16.coadY16.results"
            }
        },
        {
            "endpoint": "get_ashby_jobs_3",
            "parameters": [
                {
                    "key": "locationId",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {
                "response": "text"
            }
        },
        {
            "endpoint": "get_ashby_jobs_4",
            "parameters": [
                {
                    "key": "jobId",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {
                "response": "api.apiconnector2.coadQ16.coadW16"
            }
        },
        {
            "endpoint": "agency-remove-user",
            "parameters": [
                {
                    "key": "user",
                    "value": "user",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "source",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "reason",
                    "value": "text",
                    "optional": true,
                    "param_in": "body"
                },
                {
                    "key": "description",
                    "value": "text",
                    "optional": true,
                    "param_in": "body"
                },
                {
                    "key": "agency",
                    "value": "custom.organization",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {}
        },
        {
            "endpoint": "parse-costidea",
            "parameters": [
                {
                    "key": "User idea",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "User ID",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {
                "Invalid idea?": "boolean",
                "Unsupported idea?": "boolean",
                "Category": "text",
                "OpenAI error?": "boolean"
            }
        },
        {
            "endpoint": "crm-appname-user-admin",
            "parameters": [
                {
                    "key": "user-id",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {
                "app name (admin)": "list.text",
                "app name (other)": "list.text"
            }
        },
        {
            "endpoint": "datadog-issue-credit",
            "parameters": [
                {
                    "key": "user-email",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "amount",
                    "value": "number",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {}
        },
        {
            "endpoint": "crm-issue-workload-credit",
            "parameters": [
                {
                    "key": "appname",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "cs-email",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "units-granted",
                    "value": "number",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "month",
                    "value": "number",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "year",
                    "value": "number",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "reason",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "note",
                    "value": "text",
                    "optional": true,
                    "param_in": "body"
                },
                {
                    "key": "user-email",
                    "value": "text",
                    "optional": true,
                    "param_in": "body"
                },
                {
                    "key": "key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {}
        },
        {
            "endpoint": "crm-2fa-check",
            "parameters": [
                {
                    "key": "email",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "auth_key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {
                "2fa": "boolean"
            }
        },
        {
            "endpoint": "intercom-2fa-reset",
            "parameters": [
                {
                    "key": "User_Email",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Auth_Key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {}
        },
        {
            "endpoint": "aibot-reset-local-copy",
            "parameters": [
                {
                    "key": "App ID",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "auth_key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {}
        },
        {
            "endpoint": "send-success-email",
            "parameters": [
                {
                    "key": "Email_To",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Email_Body",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Email_Sender_Name",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Email_Reply_To_Email",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Email_Subject",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "auth_key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {}
        },
        {
            "endpoint": "greatquestion_unsubscribe",
            "parameters": [
                {
                    "key": "_wf_request_data",
                    "value": "api_wf_data.cohNi",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": true,
            "return_btype": {}
        },
        {
            "endpoint": "platform-new-application",
            "parameters": [
                {
                    "key": "shortName",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {}
        },
        {
            "endpoint": "get_ap",
            "parameters": [
                {
                    "key": "app_id",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "user_email",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {
                "plan": "text",
                "app_owner": "boolean"
            }
        },
        {
            "endpoint": "certification-agency-counts",
            "parameters": [
                {
                    "key": "organization",
                    "value": "custom.organization",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {
                "users with valid certificates": "list.text",
                "users with expired certificates": "list.text"
            }
        },
        {
            "endpoint": "pdf-generation-webhook",
            "parameters": [
                {
                    "key": "_wf_request_data",
                    "value": "api_wf_data.covSq8",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": true,
            "return_btype": {}
        },
        {
            "endpoint": "get_ui_flusk",
            "parameters": [
                {
                    "key": "email",
                    "value": "text",
                    "optional": true,
                    "param_in": "body"
                },
                {
                    "key": "id",
                    "value": "text",
                    "optional": true,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {
                "email": "text",
                "id": "text"
            }
        },
        {
            "endpoint": "get_ua_flusk",
            "parameters": [
                {
                    "key": "id",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": "text"
        },
        {
            "endpoint": "ddcr",
            "parameters": [
                {
                    "key": "id",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": true,
            "return_btype": {
                "Total": "number",
                "Test passed?": "boolean",
                "Endpoints checked": "list.text"
            }
        },
        {
            "endpoint": "get_ac_flusk",
            "parameters": [
                {
                    "key": "app",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {
                "collaborators": "list.text"
            }
        },
        {
            "endpoint": "marketplace-response",
            "parameters": [
                {
                    "key": "Type",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Outcome",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Marketplace ID",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Pending Version",
                    "value": "text",
                    "optional": true,
                    "param_in": "body"
                },
                {
                    "key": "Reason",
                    "value": "text",
                    "optional": true,
                    "param_in": "body"
                },
                {
                    "key": "Reviewer",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Name",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "auth_key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {}
        },
        {
            "endpoint": "template-submission",
            "parameters": [
                {
                    "key": "Template",
                    "value": "custom.template",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "auth_key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "User Email",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {}
        },
        {
            "endpoint": "aibot-issue-refund",
            "parameters": [
                {
                    "key": "User_Email",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Amount",
                    "value": "number",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Charge_ID",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "auth_key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {}
        },
        {
            "endpoint": "aibot-get-user-template-apps",
            "parameters": [
                {
                    "key": "Email",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Workflow_Triggered",
                    "value": "option.bot_workflows",
                    "optional": true,
                    "param_in": "body"
                },
                {
                    "key": "auth_key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": "text"
        },
        {
            "endpoint": "intercom-contact-success",
            "parameters": [
                {
                    "key": "_wf_request_data",
                    "value": "api_wf_data.cpJNw7",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {}
        },
        {
            "endpoint": "aibot-cancel-then-refund",
            "parameters": [
                {
                    "key": "User_Email",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "App_ID",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Conversation_ID",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "auth_key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Charge_ID",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Amount",
                    "value": "number",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {}
        },
        {
            "endpoint": "success-contact-create",
            "parameters": [
                {
                    "key": "User",
                    "value": "user",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Auth key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": "admin_only",
            "return_btype": {}
        },
        {
            "endpoint": "cancel-agency-subscription",
            "parameters": [
                {
                    "key": "auth_key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Organization_UID",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Recoverable?",
                    "value": "boolean",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "User initiated?",
                    "value": "boolean",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Reason",
                    "value": "text",
                    "optional": true,
                    "param_in": "body"
                },
                {
                    "key": "Other_description",
                    "value": "text",
                    "optional": true,
                    "param_in": "body"
                },
                {
                    "key": "User_Email",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {}
        },
        {
            "endpoint": "agency-cancel-then-credits",
            "parameters": [
                {
                    "key": "auth_key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "User_Email",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Organization_UID",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Amount",
                    "value": "number",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Conversation_ID",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Invoice_ID",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {}
        },
        {
            "endpoint": "success-contact-update",
            "parameters": [
                {
                    "key": "User",
                    "value": "user",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Auth key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": "admin_only",
            "return_btype": {}
        },
        {
            "endpoint": "agency-cancel-then-refund",
            "parameters": [
                {
                    "key": "auth_key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Organization_UID",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "User_Email",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Amount",
                    "value": "number",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Charge_ID",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {}
        },
        {
            "endpoint": "coupon_check",
            "parameters": [
                {
                    "key": "code",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {
                "cta_header": "text",
                "cta_text": "text",
                "signup_text": "text",
                "coupon": "text",
                "stripe_id": "text",
                "only_new_users": "boolean"
            }
        },
        {
            "endpoint": "ai-bot-retry-failed-payment",
            "parameters": [
                {
                    "key": "Email",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "auth_key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Invoice_ID",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {}
        },
        {
            "endpoint": "referral_code_check",
            "parameters": [
                {
                    "key": "code",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {
                "valid?": "boolean",
                "first_name": "text"
            }
        },
        {
            "endpoint": "intercom-assign-temp-password",
            "parameters": [
                {
                    "key": "User_Email",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Auth_Key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": "text"
        },
        {
            "endpoint": "intercom-get-users-last-four",
            "parameters": [
                {
                    "key": "User_Email",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Auth_Key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Inputted_Last_Four",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": "text"
        },
        {
            "endpoint": "aibot-segment",
            "parameters": [
                {
                    "key": "User_ID",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "auth_key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "message_type",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "message_content",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "experiment_group",
                    "value": "text",
                    "optional": true,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {}
        },
        {
            "endpoint": "aibot-slack-bug-report",
            "parameters": [
                {
                    "key": "auth_key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Conversation_ID",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "App",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Description",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Source_lang",
                    "value": "text",
                    "optional": true,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {}
        },
        {
            "endpoint": "aibot-recording-translation",
            "parameters": [
                {
                    "key": "auth_key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "transcript",
                    "value": "text",
                    "optional": true,
                    "param_in": "body"
                },
                {
                    "key": "language",
                    "value": "text",
                    "optional": true,
                    "param_in": "body"
                },
                {
                    "key": "summary",
                    "value": "text",
                    "optional": true,
                    "param_in": "body"
                },
                {
                    "key": "conversation_ID",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {}
        },
        {
            "endpoint": "aibot-email-validation",
            "parameters": [
                {
                    "key": "auth_key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "email",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {}
        },
        {
            "endpoint": "aibot-email-confirmation",
            "parameters": [
                {
                    "key": "User_ID",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "auth_key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": "text"
        },
        {
            "endpoint": "aibot-tour-segment",
            "parameters": [
                {
                    "key": "User_ID",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "auth_key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "experiment_group",
                    "value": "text",
                    "optional": true,
                    "param_in": "body"
                },
                {
                    "key": "tour_type",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "tour_status",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {}
        },
        {
            "endpoint": "aibot-update-cancellation-reason",
            "parameters": [
                {
                    "key": "App_ID",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Sub_ID",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "auth_key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Conversation_ID",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {}
        },
        {
            "endpoint": "retrieve-prompt",
            "parameters": [
                {
                    "key": "Prompt hash",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Page",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {
                "Prompt": "text",
                "Converted": "boolean",
                "Start from": "option.project___start_from",
                "Exists?": "boolean",
                "App type": "option.project_type"
            }
        },
        {
            "endpoint": "update-prompt",
            "parameters": [
                {
                    "key": "Prompt hash",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Prompt",
                    "value": "text",
                    "optional": true,
                    "param_in": "body"
                },
                {
                    "key": "Page",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Converted",
                    "value": "boolean",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Start from",
                    "value": "option.project___start_from",
                    "optional": true,
                    "param_in": "body"
                },
                {
                    "key": "App type",
                    "value": "option.project_type",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Remix",
                    "value": "custom.remixcategory",
                    "optional": true,
                    "param_in": "body"
                },
                {
                    "key": "Remix vibe",
                    "value": "option.remix_vibe",
                    "optional": true,
                    "param_in": "body"
                },
                {
                    "key": "Remix color theme",
                    "value": "option.color_theme",
                    "optional": true,
                    "param_in": "body"
                },
                {
                    "key": "Remix app name",
                    "value": "text",
                    "optional": true,
                    "param_in": "body"
                },
                {
                    "key": "Remix app context",
                    "value": "text",
                    "optional": true,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {}
        },
        {
            "endpoint": "aibot-update-cancellation-reason-all",
            "parameters": [
                {
                    "key": "auth_key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Conversation_ID",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "User_Email",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Apps_List",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {}
        },
        {
            "endpoint": "aibot-delete-card",
            "parameters": [
                {
                    "key": "User_Email",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "auth_key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {}
        },
        {
            "endpoint": "aibot-cancel-then-delete-card",
            "parameters": [
                {
                    "key": "User_Email",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Conversation_ID",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "auth_key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "App_ID",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Cancel_all_flow",
                    "value": "boolean",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {}
        },
        {
            "endpoint": "aibot-updatesubscriptionitem",
            "parameters": [
                {
                    "key": "Email",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "App_ID",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Conversation_ID",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "cancel_all_flow",
                    "value": "boolean",
                    "optional": true,
                    "param_in": "body"
                },
                {
                    "key": "immediate_cancelation",
                    "value": "text",
                    "optional": true,
                    "param_in": "body"
                },
                {
                    "key": "auth_key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Workflow_Sub_state",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {}
        },
        {
            "endpoint": "user_fetch_forum_username",
            "parameters": [
                {
                    "key": "user unique ID",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {
                "username": "text"
            }
        },
        {
            "endpoint": "secret_scanner_email",
            "parameters": [
                {
                    "key": "auth_key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "app_id",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "email_body",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "email_subject",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": true,
            "return_btype": {}
        },
        {
            "endpoint": "email_exists_in_bubble",
            "parameters": [
                {
                    "key": "email",
                    "value": "text",
                    "optional": false,
                    "param_in": "query"
                }
            ],
            "method": "get",
            "auth_unecessary": false,
            "return_btype": {
                "in_bubble": "boolean",
                "UID": "text",
                "checked_email": "text"
            }
        },
        {
            "endpoint": "successai-retrieve-ideas",
            "parameters": [
                {
                    "key": "auth_key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Feature_Request_ID",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": "text"
        },
        {
            "endpoint": "cancel-subscription",
            "parameters": [
                {
                    "key": "Email",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "App_ID",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Conversation_ID",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "cancel_all_flow",
                    "value": "boolean",
                    "optional": true,
                    "param_in": "body"
                },
                {
                    "key": "immediate_cancelation",
                    "value": "text",
                    "optional": true,
                    "param_in": "body"
                },
                {
                    "key": "auth_key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": {}
        },
        {
            "endpoint": "aibot-delete-card-eligibility",
            "parameters": [
                {
                    "key": "User_Email",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "auth_key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": "text"
        },
        {
            "endpoint": "aibot-check-for-cc",
            "parameters": [
                {
                    "key": "User_Email",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "auth_key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": false,
            "return_btype": "text"
        },
        {
            "endpoint": "template_price_check",
            "parameters": [
                {
                    "key": "template",
                    "value": "custom.template",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "template_license",
                    "value": "option.template_license",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "coupon_code",
                    "value": "text",
                    "optional": true,
                    "param_in": "body"
                },
                {
                    "key": "buyer_user",
                    "value": "user",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": "admin_only",
            "return_btype": {
                "price": "number",
                "coupon_id": "text"
            }
        },
        {
            "endpoint": "agency_public_email",
            "parameters": [
                {
                    "key": "org_id",
                    "value": "text",
                    "optional": false,
                    "param_in": "query"
                }
            ],
            "method": "get",
            "auth_unecessary": false,
            "return_btype": {
                "Public_Email": "text"
            }
        },
        {
            "endpoint": "success-segment",
            "parameters": [
                {
                    "key": "user_ID",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "auth_key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "event_type",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "series",
                    "value": "text",
                    "optional": true,
                    "param_in": "body"
                },
                {
                    "key": "initiative",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": "admin_only",
            "return_btype": {}
        },
        {
            "endpoint": "parse",
            "parameters": [
                {
                    "key": "Content",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": "admin_only",
            "return_btype": "text"
        },
        {
            "endpoint": "ai-validateinput",
            "parameters": [
                {
                    "key": "Message",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Conversation",
                    "value": "custom.aiconversation",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": "admin_only",
            "return_btype": "text"
        },
        {
            "endpoint": "aibot-checkoverages",
            "parameters": [
                {
                    "key": "auth_key",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "User_Email",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "App_ID",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": "admin_only",
            "return_btype": {
                "Any Overages?": "boolean"
            }
        },
        {
            "endpoint": "ai-tool-askquestion",
            "parameters": [
                {
                    "key": "conversation",
                    "value": "custom.aiconversation",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "tool_arguments",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "assistant_message",
                    "value": "custom.aimessage",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": "admin_only",
            "return_btype": {
                "display_message": "text",
                "error": "boolean",
                "done?": "boolean"
            }
        },
        {
            "endpoint": "ai-validateimage",
            "parameters": [
                {
                    "key": "Message_content",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Conversation",
                    "value": "custom.aiconversation",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Attachment",
                    "value": "custom.aiattachment",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": "admin_only",
            "return_btype": "text"
        },
        {
            "endpoint": "ai-tool-updatefeatureplan",
            "parameters": [
                {
                    "key": "conversation",
                    "value": "custom.aiconversation",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "tool_arguments",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": "admin_only",
            "return_btype": {
                "tool summary - internal": "text",
                "display_message": "text",
                "error": "boolean",
                "tool summary - user": "text",
                "included json?": "boolean"
            }
        },
        {
            "endpoint": "ai-resetstream",
            "parameters": [],
            "method": "post",
            "auth_unecessary": "admin_only",
            "return_btype": "text"
        },
        {
            "endpoint": "allowed-email-check",
            "parameters": [
                {
                    "key": "email",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": "admin_only",
            "return_btype": {
                "allowed?": "boolean"
            }
        },
        {
            "endpoint": "update-launchkit-app",
            "parameters": [
                {
                    "key": "appid",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Region",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Rank",
                    "value": "number",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Region_specific",
                    "value": "text",
                    "optional": false,
                    "param_in": "body"
                },
                {
                    "key": "Rank_specific",
                    "value": "number",
                    "optional": false,
                    "param_in": "body"
                }
            ],
            "method": "post",
            "auth_unecessary": "admin_only",
            "return_btype": {}
        }
    ],
    "types": {
        "learnlesson": {
            "display": "learn lesson",
            "fields": [
                {
                    "id": "lesson_description",
                    "display": "lesson description",
                    "type": "text"
                },
                {
                    "id": "lesson_name",
                    "display": "lesson name",
                    "type": "text"
                },
                {
                    "id": "number",
                    "display": "number",
                    "type": "number"
                },
                {
                    "id": "rank",
                    "display": "rank",
                    "type": "number"
                },
                {
                    "id": "Created Date",
                    "display": "Created Date",
                    "type": "date"
                },
                {
                    "id": "Modified Date",
                    "display": "Modified Date",
                    "type": "date"
                },
                {
                    "id": "Created By",
                    "display": "Created By",
                    "type": "user"
                },
                {
                    "id": "_id",
                    "display": "unique ID",
                    "type": "text"
                },
                {
                    "id": "Slug",
                    "display": "Slug",
                    "type": "text"
                }
            ]
        },
        "abusereport": {
            "display": "Abuse report",
            "fields": [
                {
                    "id": "abusing_urls_text",
                    "display": "Abusing URLs",
                    "type": "text"
                },
                {
                    "id": "category_text",
                    "display": "Category",
                    "type": "text"
                },
                {
                    "id": "comments_text",
                    "display": "Comments",
                    "type": "text"
                },
                {
                    "id": "description_text",
                    "display": "Description",
                    "type": "text"
                },
                {
                    "id": "email_summary_text",
                    "display": "Email Summary",
                    "type": "text"
                },
                {
                    "id": "reporter_company_text",
                    "display": "Reporter company",
                    "type": "text"
                },
                {
                    "id": "reporter_email_text",
                    "display": "Reporter email",
                    "type": "text"
                },
                {
                    "id": "reporter_first_name_text",
                    "display": "Reporter first name",
                    "type": "text"
                },
                {
                    "id": "reporter_last_name_text",
                    "display": "Reporter last name",
                    "type": "text"
                },
                {
                    "id": "reporter_title_text",
                    "display": "Reporter title",
                    "type": "text"
                },
                {
                    "id": "source_text",
                    "display": "Source",
                    "type": "text"
                },
                {
                    "id": "Created Date",
                    "display": "Created Date",
                    "type": "date"
                },
                {
                    "id": "Modified Date",
                    "display": "Modified Date",
                    "type": "date"
                },
                {
                    "id": "Created By",
                    "display": "Created By",
                    "type": "user"
                },
                {
                    "id": "_id",
                    "display": "unique ID",
                    "type": "text"
                },
                {
                    "id": "Slug",
                    "display": "Slug",
                    "type": "text"
                }
            ]
        },
        "affiliatecommissionpayout": {
            "display": "Affiliate Commission Payout",
            "fields": [
                {
                    "id": "affiliate_user",
                    "display": "Affiliate",
                    "type": "user"
                },
                {
                    "id": "amount_number",
                    "display": "Amount",
                    "type": "number"
                },
                {
                    "id": "items_list_custom_affiliate_revenue_item",
                    "display": "Items",
                    "type": "list.custom.affiliatecommissionitem"
                },
                {
                    "id": "month_text",
                    "display": "Month",
                    "type": "text"
                },
                {
                    "id": "payee_account_user",
                    "display": "Payee account",
                    "type": "user"
                },
                {
                    "id": "payment_id_text",
                    "display": "Payment ID",
                    "type": "text"
                },
                {
                    "id": "transfer_id_text",
                    "display": "Transfer ID",
                    "type": "text"
                },
                {
                    "id": "Created Date",
                    "display": "Created Date",
                    "type": "date"
                },
                {
                    "id": "Modified Date",
                    "display": "Modified Date",
                    "type": "date"
                },
                {
                    "id": "Created By",
                    "display": "Created By",
                    "type": "user"
                },
                {
                    "id": "_id",
                    "display": "unique ID",
                    "type": "text"
                },
                {
                    "id": "Slug",
                    "display": "Slug",
                    "type": "text"
                }
            ]
        },
        "aiquestion": {
            "display": "AI Question",
            "fields": [
                {
                    "id": "answer_list_text",
                    "display": "answers selected",
                    "type": "list.text"
                },
                {
                    "id": "conversation_custom_ai_conversation",
                    "display": "conversation",
                    "type": "custom.aiconversation"
                },
                {
                    "id": "custom_answer_input_text",
                    "display": "custom answer input",
                    "type": "text"
                },
                {
                    "id": "message_custom_ai_message",
                    "display": "message",
                    "type": "custom.aimessage"
                },
                {
                    "id": "options_list_text",
                    "display": "options",
                    "type": "list.text"
                },
                {
                    "id": "question_text_text",
                    "display": "question text",
                    "type": "text"
                },
                {
                    "id": "skipped_boolean",
                    "display": "skipped",
                    "type": "boolean"
                },
                {
                    "id": "type_option_ai_questiontype",
                    "display": "type",
                    "type": "option.ai_questiontype"
                },
                {
                    "id": "user_user",
                    "display": "user",
                    "type": "user"
                },
                {
                    "id": "Created Date",
                    "display": "Created Date",
                    "type": "date"
                },
                {
                    "id": "Modified Date",
                    "display": "Modified Date",
                    "type": "date"
                },
                {
                    "id": "Created By",
                    "display": "Created By",
                    "type": "user"
                },
                {
                    "id": "_id",
                    "display": "unique ID",
                    "type": "text"
                },
                {
                    "id": "Slug",
                    "display": "Slug",
                    "type": "text"
                }
            ]
        },
        "appgallerysubmission": {
            "display": "App Gallery Submission",
            "fields": [
                {
                    "id": "accepted_acknowledgement__boolean",
                    "display": "Accepted acknowledgement?",
                    "type": "boolean"
                },
                {
                    "id": "accepted_terms__boolean",
                    "display": "Accepted terms?",
                    "type": "boolean"
                },
                {
                    "id": "additional_images_list_image",
                    "display": "Additional images",
                    "type": "list.image"
                },
                {
                    "id": "app_categories_list_option_app_gallery_category",
                    "display": "App Categories",
                    "type": "list.option.app_gallery_category"
                },
                {
                    "id": "app_description_text",
                    "display": "App description",
                    "type": "text"
                },
                {
                    "id": "app_gallery_updates_list_custom_app_gallery_submission",
                    "display": "App Gallery Updates",
                    "type": "list.custom.appgallerysubmission"
                },
                {
                    "id": "app_metadata_record_custom_application_metadata",
                    "display": "App metadata record",
                    "type": "custom.applicationmetadata"
                },
                {
                    "id": "app_name_text",
                    "display": "App name",
                    "type": "text"
                },
                {
                    "id": "appid_text",
                    "display": "appid",
                    "type": "text"
                },
                {
                    "id": "bubble_url_text",
                    "display": "Bubble URL",
                    "type": "text"
                },
                {
                    "id": "company_url_text",
                    "display": "company url",
                    "type": "text"
                },
                {
                    "id": "curated__boolean",
                    "display": "curated?",
                    "type": "boolean"
                },
                {
                    "id": "featured_hero_image_image",
                    "display": "featured_hero_image",
                    "type": "image"
                },
                {
                    "id": "founder_alias_text",
                    "display": "Founder alias",
                    "type": "text"
                },
                {
                    "id": "founder_image_image",
                    "display": "founder image",
                    "type": "image"
                },
                {
                    "id": "include_link__boolean",
                    "display": "Include link?",
                    "type": "boolean"
                },
                {
                    "id": "include_thumbnail_in_listing__boolean",
                    "display": "Include thumbnail in listing?",
                    "type": "boolean"
                },
                {
                    "id": "industry_category_option_app_gallery_category",
                    "display": "Industry/Category",
                    "type": "option.app_gallery_category"
                },
                {
                    "id": "launchlab_1_boolean",
                    "display": "launchlab?",
                    "type": "boolean"
                },
                {
                    "id": "launchlab__boolean",
                    "display": "global?",
                    "type": "boolean"
                },
                {
                    "id": "logo_image",
                    "display": "Logo",
                    "type": "image"
                },
                {
                    "id": "modified_by_user_date_date",
                    "display": "modified by user date",
                    "type": "date"
                },
                {
                    "id": "one_liner_description_text",
                    "display": "One liner description",
                    "type": "text"
                },
                {
                    "id": "page_views_number",
                    "display": "page views",
                    "type": "number"
                },
                {
                    "id": "platform_option_app_gallery_platform",
                    "display": "Platform",
                    "type": "option.app_gallery_platform"
                },
                {
                    "id": "rank_number",
                    "display": "Rank",
                    "type": "number"
                },
                {
                    "id": "rank_specific_number",
                    "display": "Rank_specific",
                    "type": "number"
                },
                {
                    "id": "region_specific_text",
                    "display": "Region_specific",
                    "type": "text"
                },
                {
                    "id": "region_text",
                    "display": "Region",
                    "type": "text"
                },
                {
                    "id": "status_option_app_gallery_status",
                    "display": "Status",
                    "type": "option.app_gallery_status"
                },
                {
                    "id": "thumbnail_image_image",
                    "display": "Thumbnail image",
                    "type": "image"
                },
                {
                    "id": "Created Date",
                    "display": "Created Date",
                    "type": "date"
                },
                {
                    "id": "Modified Date",
                    "display": "Modified Date",
                    "type": "date"
                },
                {
                    "id": "Created By",
                    "display": "Created By",
                    "type": "user"
                },
                {
                    "id": "_id",
                    "display": "unique ID",
                    "type": "text"
                },
                {
                    "id": "Slug",
                    "display": "Slug",
                    "type": "text"
                }
            ]
        },
        "applicationmetadata": {
            "display": "Application Metadata",
            "fields": [
                {
                    "id": "ai_generation_status_option_bubble_ai_status",
                    "display": "ai_generation_status",
                    "type": "option.bubble_ai_status"
                },
                {
                    "id": "ai_generation_succcessful_boolean",
                    "display": "ai_generation_successful",
                    "type": "boolean"
                },
                {
                    "id": "app_color___text_text",
                    "display": "App Color - Text",
                    "type": "text"
                },
                {
                    "id": "app_color_text",
                    "display": "App Color - Icon",
                    "type": "text"
                },
                {
                    "id": "app_icon_image",
                    "display": "App Icon",
                    "type": "image"
                },
                {
                    "id": "app_name_text",
                    "display": "Caption",
                    "type": "text"
                },
                {
                    "id": "cancellation_source_text",
                    "display": "cancellation_source",
                    "type": "text"
                },
                {
                    "id": "conversation_custom_ai_conversation",
                    "display": "conversation",
                    "type": "custom.aiconversation"
                },
                {
                    "id": "crm_app_description_text",
                    "display": "zCRM app description",
                    "type": "text"
                },
                {
                    "id": "fa_boolean",
                    "display": "FA",
                    "type": "boolean"
                },
                {
                    "id": "goal_text",
                    "display": "Goal",
                    "type": "text"
                },
                {
                    "id": "has_deprecated_plugin__boolean",
                    "display": "Has deprecated plugin?",
                    "type": "boolean"
                },
                {
                    "id": "last_change__date",
                    "display": "last change ",
                    "type": "date"
                },
                {
                    "id": "local_copy_text",
                    "display": "local copy",
                    "type": "text"
                },
                {
                    "id": "rb_user",
                    "display": "RB",
                    "type": "user"
                },
                {
                    "id": "realappname_text",
                    "display": "App ID",
                    "type": "text"
                },
                {
                    "id": "ro_date",
                    "display": "RO",
                    "type": "date"
                },
                {
                    "id": "sl_list_image",
                    "display": "Screenshot list",
                    "type": "list.image"
                },
                {
                    "id": "trial_source_text",
                    "display": "trial_source",
                    "type": "text"
                },
                {
                    "id": "Created Date",
                    "display": "Created Date",
                    "type": "date"
                },
                {
                    "id": "Modified Date",
                    "display": "Modified Date",
                    "type": "date"
                },
                {
                    "id": "Created By",
                    "display": "Created By",
                    "type": "user"
                },
                {
                    "id": "_id",
                    "display": "unique ID",
                    "type": "text"
                },
                {
                    "id": "Slug",
                    "display": "Slug",
                    "type": "text"
                }
            ]
        },
        "supportarticle": {
            "display": "Support article",
            "fields": [
                {
                    "id": "bug_report_types_list_option_support_bug_report_type",
                    "display": "Bug Report Types",
                    "type": "list.option.support_bug_report_type"
                },
                {
                    "id": "click_count_number",
                    "display": "Click count",
                    "type": "number"
                },
                {
                    "id": "content_text",
                    "display": "Content",
                    "type": "text"
                },
                {
                    "id": "custom_lists_list_text",
                    "display": "Custom lists",
                    "type": "list.text"
                },
                {
                    "id": "depreciated_boolean",
                    "display": "Depreciated",
                    "type": "boolean"
                },
                {
                    "id": "prioritize_boolean",
                    "display": "Prioritize",
                    "type": "boolean"
                },
                {
                    "id": "rank_number",
                    "display": "Rank",
                    "type": "number"
                },
                {
                    "id": "title_text",
                    "display": "Title",
                    "type": "text"
                },
                {
                    "id": "topic_option_support_articles_topics",
                    "display": "Topic",
                    "type": "option.support_articles_topics"
                },
                {
                    "id": "video_text",
                    "display": "Video",
                    "type": "text"
                },
                {
                    "id": "Created Date",
                    "display": "Created Date",
                    "type": "date"
                },
                {
                    "id": "Modified Date",
                    "display": "Modified Date",
                    "type": "date"
                },
                {
                    "id": "Created By",
                    "display": "Created By",
                    "type": "user"
                },
                {
                    "id": "_id",
                    "display": "unique ID",
                    "type": "text"
                },
                {
                    "id": "Slug",
                    "display": "Slug",
                    "type": "text"
                }
            ]
        },
        "bootcamp": {
            "display": "Bootcamp",
            "fields": [
                {
                    "id": "alternative_video_link_text",
                    "display": "Alternative video link",
                    "type": "text"
                },
                {
                    "id": "bootcamp_cadence_option_bootcamp_cadence",
                    "display": "Cadence",
                    "type": "option.bootcamp_cadence"
                },
                {
                    "id": "bootcamp_type_option_bootcamp_type",
                    "display": "Type OLD",
                    "type": "option.bootcamp_type"
                },
                {
                    "id": "cancelled_boolean",
                    "display": "Cancelled",
                    "type": "boolean"
                },
                {
                    "id": "coach1_custom_coach",
                    "display": "Instructor Profile",
                    "type": "custom.zbootcampinstructor"
                },
                {
                    "id": "compensation_type_option_instructor_compensation_type",
                    "display": "Compensation type",
                    "type": "option.instructor_compensation_type"
                },
                {
                    "id": "course_custom_course1",
                    "display": "Type NEW",
                    "type": "custom.zbootcamptype"
                },
                {
                    "id": "custom_about_text_text",
                    "display": "Custom overview",
                    "type": "text"
                },
                {
                    "id": "custom_class_schedule_headline_text",
                    "display": "Custom class schedule headline",
                    "type": "text"
                },
                {
                    "id": "custom_title_text",
                    "display": "Custom title",
                    "type": "text"
                },
                {
                    "id": "custom_what_to_expect_text",
                    "display": "Custom what you'll get",
                    "type": "text"
                },
                {
                    "id": "discount_price_number",
                    "display": "Early bird price",
                    "type": "number"
                },
                {
                    "id": "early_bird_boolean",
                    "display": "Early bird eligible",
                    "type": "boolean"
                },
                {
                    "id": "early_bird_eligible_boolean",
                    "display": "Early bird is active",
                    "type": "boolean"
                },
                {
                    "id": "early_bird_threshold_number",
                    "display": "Early bird threshold",
                    "type": "number"
                },
                {
                    "id": "first_session_date",
                    "display": "First session",
                    "type": "date"
                },
                {
                    "id": "go_live_date_backend_id_text",
                    "display": "Unhide Date Backend ID",
                    "type": "text"
                },
                {
                    "id": "hidden_boolean",
                    "display": "Hidden",
                    "type": "boolean"
                },
                {
                    "id": "instructor_compensation_number",
                    "display": "Instructor compensation",
                    "type": "number"
                },
                {
                    "id": "instructor_referral_bonus_number",
                    "display": "Partner affiliate fee",
                    "type": "number"
                },
                {
                    "id": "instructor_user",
                    "display": "Instructor Linked User",
                    "type": "user"
                },
                {
                    "id": "language_text",
                    "display": "Language",
                    "type": "text"
                },
                {
                    "id": "office_hours_list_date",
                    "display": "Office hours",
                    "type": "list.date"
                },
                {
                    "id": "online_boolean",
                    "display": "Online",
                    "type": "boolean"
                },
                {
                    "id": "perk_program_custom_perk_program",
                    "display": "Perk program",
                    "type": "custom.perkprogram"
                },
                {
                    "id": "price_number",
                    "display": "Price",
                    "type": "number"
                },
                {
                    "id": "private_boolean",
                    "display": "Private",
                    "type": "boolean"
                },
                {
                    "id": "published_boolean",
                    "display": "Published",
                    "type": "boolean"
                },
                {
                    "id": "requests_notes_text",
                    "display": "Requests Notes",
                    "type": "text"
                },
                {
                    "id": "seats_number",
                    "display": "Seats",
                    "type": "number"
                },
                {
                    "id": "second_session__twice_weekly_only__date",
                    "display": "Second Session (Twice Weekly Only)",
                    "type": "date"
                },
                {
                    "id": "send_surveys_boolean",
                    "display": "Send surveys",
                    "type": "boolean"
                },
                {
                    "id": "sessions_list_custom_bootcamp_session",
                    "display": "Sessions",
                    "type": "list.custom.bootcampsession"
                },
                {
                    "id": "sessions_number",
                    "display": "Number of sessions",
                    "type": "number"
                },
                {
                    "id": "slack_channel_id_text",
                    "display": "Slack channel ID",
                    "type": "text"
                },
                {
                    "id": "so_google_drive_link__text",
                    "display": "SO Google Drive Link ",
                    "type": "text"
                },
                {
                    "id": "sold_out_boolean",
                    "display": "Sold out",
                    "type": "boolean"
                },
                {
                    "id": "special_promotion_copy_text",
                    "display": "Special promotion copy",
                    "type": "text"
                },
                {
                    "id": "special_promotion_end_date_date",
                    "display": "Special promotion end date",
                    "type": "date"
                },
                {
                    "id": "special_promotion_price_number",
                    "display": "Special promotion price",
                    "type": "number"
                },
                {
                    "id": "special_promotion_start_date_date",
                    "display": "Special promotion start date",
                    "type": "date"
                },
                {
                    "id": "status_option_bootcamp_request_status",
                    "display": "Status",
                    "type": "option.bootcamp_request_status"
                },
                {
                    "id": "timezone_text",
                    "display": "Timezone",
                    "type": "text"
                },
                {
                    "id": "title_text",
                    "display": "Title",
                    "type": "text"
                },
                {
                    "id": "unhide_date_date",
                    "display": "Unhide Date",
                    "type": "date"
                },
                {
                    "id": "video_file",
                    "display": "Video",
                    "type": "file"
                },
                {
                    "id": "Created Date",
                    "display": "Created Date",
                    "type": "date"
                },
                {
                    "id": "Modified Date",
                    "display": "Modified Date",
                    "type": "date"
                },
                {
                    "id": "Created By",
                    "display": "Created By",
                    "type": "user"
                },
                {
                    "id": "_id",
                    "display": "unique ID",
                    "type": "text"
                },
                {
                    "id": "Slug",
                    "display": "Slug",
                    "type": "text"
                }
            ]
        },
        "bootcampsession": {
            "display": "bootcamp session",
            "fields": [
                {
                    "id": "attendees_list_custom_bootcamp_ticket",
                    "display": "attendees",
                    "type": "list.custom.bootcampticket"
                },
                {
                    "id": "bootcamp_custom_bootcamp",
                    "display": "bootcamp",
                    "type": "custom.bootcamp"
                },
                {
                    "id": "date_date",
                    "display": "date",
                    "type": "date"
                },
                {
                    "id": "duration_number",
                    "display": "duration",
                    "type": "number"
                },
                {
                    "id": "followup_sent_boolean",
                    "display": "Followup sent",
                    "type": "boolean"
                },
                {
                    "id": "homework_file_file",
                    "display": "homework_file",
                    "type": "file"
                },
                {
                    "id": "homework_link_text",
                    "display": "homework_link",
                    "type": "text"
                },
                {
                    "id": "ical_sequence_number",
                    "display": "ical sequence",
                    "type": "number"
                },
                {
                    "id": "ical_uuid_text",
                    "display": "ical uuid",
                    "type": "text"
                },
                {
                    "id": "instructor_notes_text",
                    "display": "instructor_notes",
                    "type": "text"
                },
                {
                    "id": "instructor_user",
                    "display": "instructor",
                    "type": "user"
                },
                {
                    "id": "recording_file_file",
                    "display": "recording_file",
                    "type": "file"
                },
                {
                    "id": "slides_file_file",
                    "display": "slides_file",
                    "type": "file"
                },
                {
                    "id": "slides_link_text",
                    "display": "slides_link",
                    "type": "text"
                },
                {
                    "id": "users_list_user",
                    "display": "zusers",
                    "type": "list.user"
                },
                {
                    "id": "Created Date",
                    "display": "Created Date",
                    "type": "date"
                },
                {
                    "id": "Modified Date",
                    "display": "Modified Date",
                    "type": "date"
                },
                {
                    "id": "Created By",
                    "display": "Created By",
                    "type": "user"
                },
                {
                    "id": "_id",
                    "display": "unique ID",
                    "type": "text"
                },
                {
                    "id": "Slug",
                    "display": "Slug",
                    "type": "text"
                }
            ]
        },
        "bootcampticket": {
            "display": "Bootcamp ticket",
            "fields": [
                {
                    "id": "affiliate_fee_number",
                    "display": "Affiliate fee",
                    "type": "number"
                },
                {
                    "id": "amount_number",
                    "display": "Amount",
                    "type": "number"
                },
                {
                    "id": "bootcamp_custom_bootcamp",
                    "display": "Bootcamp",
                    "type": "custom.bootcamp"
                },
                {
                    "id": "bootcamp_sessions_attended_list_custom_bootcamp_session",
                    "display": "Bootcamp Sessions Attended",
                    "type": "list.custom.bootcampsession"
                },
                {
                    "id": "charge_id_text",
                    "display": "Charge ID",
                    "type": "text"
                },
                {
                    "id": "count_towards_seats_boolean",
                    "display": "Count towards seats",
                    "type": "boolean"
                },
                {
                    "id": "email_text",
                    "display": "Email",
                    "type": "text"
                },
                {
                    "id": "paid_to_affiliate_boolean",
                    "display": "Affiliate paid",
                    "type": "boolean"
                },
                {
                    "id": "referral_code_text",
                    "display": "Affiliate Partner code",
                    "type": "text"
                },
                {
                    "id": "referrer_user",
                    "display": "Affiliate Partner",
                    "type": "user"
                },
                {
                    "id": "refunded_boolean",
                    "display": "Refunded",
                    "type": "boolean"
                },
                {
                    "id": "user_user",
                    "display": "User",
                    "type": "user"
                },
                {
                    "id": "utm_campaign_text",
                    "display": "utm_campaign",
                    "type": "text"
                },
                {
                    "id": "utm_medium_text",
                    "display": "utm_medium",
                    "type": "text"
                },
                {
                    "id": "utm_source_text",
                    "display": "utm_source",
                    "type": "text"
                },
                {
                    "id": "Created Date",
                    "display": "Created Date",
                    "type": "date"
                },
                {
                    "id": "Modified Date",
                    "display": "Modified Date",
                    "type": "date"
                },
                {
                    "id": "Created By",
                    "display": "Created By",
                    "type": "user"
                },
                {
                    "id": "_id",
                    "display": "unique ID",
                    "type": "text"
                },
                {
                    "id": "Slug",
                    "display": "Slug",
                    "type": "text"
                }
            ]
        },
        "zsupportinquiry": {
            "display": "zSupport Inquiry",
            "fields": [
                {
                    "id": "23___screen_recording_text",
                    "display": "08 - Screen recording",
                    "type": "text"
                },
                {
                    "id": "app_version_name_text",
                    "display": "07 - Impacted version name",
                    "type": "text"
                },
                {
                    "id": "appname_text",
                    "display": "05 - Impacted application",
                    "type": "text"
                },
                {
                    "id": "bot_id_text",
                    "display": "Bot ID",
                    "type": "text"
                },
                {
                    "id": "error_code_text",
                    "display": "11 - Error code",
                    "type": "text"
                },
                {
                    "id": "files_list_file",
                    "display": "09 - File(s) upload",
                    "type": "list.file"
                },
                {
                    "id": "front_id_text",
                    "display": "12 - Front ID",
                    "type": "text"
                },
                {
                    "id": "source_option_support_forms",
                    "display": "01 - Source",
                    "type": "option.support_forms"
                },
                {
                    "id": "step_by_step_text",
                    "display": "04 - Reproduction steps",
                    "type": "text"
                },
                {
                    "id": "symptoms_text",
                    "display": "10 - Other details",
                    "type": "text"
                },
                {
                    "id": "title_text",
                    "display": "03 - Short description",
                    "type": "text"
                },
                {
                    "id": "user_email_text",
                    "display": "02 - User email",
                    "type": "text"
                },
                {
                    "id": "version_text",
                    "display": "06 - Impacted version",
                    "type": "text"
                },
                {
                    "id": "Created Date",
                    "display": "Created Date",
                    "type": "date"
                },
                {
                    "id": "Modified Date",
                    "display": "Modified Date",
                    "type": "date"
                },
                {
                    "id": "Created By",
                    "display": "Created By",
                    "type": "user"
                },
                {
                    "id": "_id",
                    "display": "unique ID",
                    "type": "text"
                },
                {
                    "id": "Slug",
                    "display": "Slug",
                    "type": "text"
                }
            ]
        },
        "zcertificationsignup": {
            "display": "zCertification signup",
            "fields": [
                {
                    "id": "email_text",
                    "display": "email",
                    "type": "text"
                },
                {
                    "id": "logged_in__boolean",
                    "display": "Logged in?",
                    "type": "boolean"
                },
                {
                    "id": "user_id_text",
                    "display": "User ID",
                    "type": "text"
                },
                {
                    "id": "user_user",
                    "display": "User",
                    "type": "user"
                },
                {
                    "id": "Created Date",
                    "display": "Created Date",
                    "type": "date"
                },
                {
                    "id": "Modified Date",
                    "display": "Modified Date",
                    "type": "date"
                },
                {
                    "id": "Created By",
                    "display": "Created By",
                    "type": "user"
                },
                {
                    "id": "_id",
                    "display": "unique ID",
                    "type": "text"
                },
                {
                    "id": "Slug",
                    "display": "Slug",
                    "type": "text"
                }
            ]
        },
        "coachingsession": {
            "display": "Coaching session",
            "fields": [
                {
                    "id": "amount_number",
                    "display": "Total amount",
                    "type": "number"
                },
                {
                    "id": "app_description_text",
                    "display": "Description - app",
                    "type": "text"
                },
                {
                    "id": "cancelled_by_user_boolean",
                    "display": "Cancelled by user",
                    "type": "boolean"
                },
                {
                    "id": "captured_boolean",
                    "display": "zCaptured",
                    "type": "boolean"
                },
                {
                    "id": "charge_description_text",
                    "display": "zCharge description",
                    "type": "text"
                },
                {
                    "id": "charge_id_text",
                    "display": "zCharge ID",
                    "type": "text"
                },
                {
                    "id": "coach_profile_custom_coach_profile",
                    "display": "Coach profile",
                    "type": "custom.coachprofile"
                },
                {
                    "id": "coach_user",
                    "display": "Coaching user",
                    "type": "user"
                },
                {
                    "id": "coached_user_email_text",
                    "display": "Coached user email",
                    "type": "text"
                },
                {
                    "id": "coached_user_name_text",
                    "display": "Coached user name",
                    "type": "text"
                },
                {
                    "id": "coached_user_user",
                    "display": "Coached user",
                    "type": "user"
                },
                {
                    "id": "completed_boolean",
                    "display": "Completed",
                    "type": "boolean"
                },
                {
                    "id": "completion_date_date",
                    "display": "Completion date",
                    "type": "date"
                },
                {
                    "id": "created_manually__boolean",
                    "display": "Created manually?",
                    "type": "boolean"
                },
                {
                    "id": "expired_boolean",
                    "display": "zExpired",
                    "type": "boolean"
                },
                {
                    "id": "follow_up_boolean",
                    "display": "Follow up",
                    "type": "boolean"
                },
                {
                    "id": "free_boolean",
                    "display": "zFree",
                    "type": "boolean"
                },
                {
                    "id": "help_description_text",
                    "display": "Description - help",
                    "type": "text"
                },
                {
                    "id": "hourly_rate_alert_sent__boolean",
                    "display": "Hourly rate alert sent?",
                    "type": "boolean"
                },
                {
                    "id": "hourly_rate_number",
                    "display": "Hourly rate",
                    "type": "number"
                },
                {
                    "id": "hourly_rate_source_text",
                    "display": "Hourly rate source",
                    "type": "text"
                },
                {
                    "id": "improvement_opportunities_text",
                    "display": "zImprovement opportunities",
                    "type": "text"
                },
                {
                    "id": "most_helpful_text",
                    "display": "zMost helpful",
                    "type": "text"
                },
                {
                    "id": "other_comments_text",
                    "display": "zOther comments",
                    "type": "text"
                },
                {
                    "id": "paid_to_coach_boolean",
                    "display": "zPaid to coach?",
                    "type": "boolean"
                },
                {
                    "id": "paid_to_coach_number",
                    "display": "zAmount paid to coach",
                    "type": "number"
                },
                {
                    "id": "publishable_boolean",
                    "display": "zPublishable",
                    "type": "boolean"
                },
                {
                    "id": "rate_limit_alert_sent__boolean",
                    "display": "Rate limit alert sent?",
                    "type": "boolean"
                },
                {
                    "id": "refunded_boolean",
                    "display": "zRefunded",
                    "type": "boolean"
                },
                {
                    "id": "reviewed_boolean",
                    "display": "zReviewed",
                    "type": "boolean"
                },
                {
                    "id": "satisfaction_rating_number",
                    "display": "zSatisfaction rating",
                    "type": "number"
                },
                {
                    "id": "scheduled_date_date",
                    "display": "Scheduled date",
                    "type": "date"
                },
                {
                    "id": "session_confirmation_file",
                    "display": "Session confirmation",
                    "type": "file"
                },
                {
                    "id": "solutions_tried_description_text",
                    "display": "Description - things tried",
                    "type": "text"
                },
                {
                    "id": "zmigrated_review___boolean",
                    "display": "zMigrated review? ",
                    "type": "boolean"
                },
                {
                    "id": "Created Date",
                    "display": "Created Date",
                    "type": "date"
                },
                {
                    "id": "Modified Date",
                    "display": "Modified Date",
                    "type": "date"
                },
                {
                    "id": "Created By",
                    "display": "Created By",
                    "type": "user"
                },
                {
                    "id": "_id",
                    "display": "unique ID",
                    "type": "text"
                },
                {
                    "id": "Slug",
                    "display": "Slug",
                    "type": "text"
                }
            ]
        },
        "contributorpayout": {
            "display": "Contributor payout",
            "fields": [
                {
                    "id": "bootcamp_items_list_custom_bootcamp_ticket",
                    "display": "Bootcamp items",
                    "type": "list.custom.bootcampticket"
                },
                {
                    "id": "business_address_text",
                    "display": "Business address",
                    "type": "text"
                },
                {
                    "id": "business_name_text",
                    "display": "Business name",
                    "type": "text"
                },
                {
                    "id": "coaching_items_list_custom_coaching_session",
                    "display": "Coaching items",
                    "type": "list.custom.coachingsession"
                },
                {
                    "id": "month_year_text",
                    "display": "Month year",
                    "type": "text"
                },
                {
                    "id": "number_text",
                    "display": "Number",
                    "type": "text"
                },
                {
                    "id": "payout_id_text",
                    "display": "Payout ID",
                    "type": "text"
                },
                {
                    "id": "paypal__boolean",
                    "display": "PayPal?",
                    "type": "boolean"
                },
                {
                    "id": "pdf_receipt_file",
                    "display": "PDF Receipt",
                    "type": "file"
                },
                {
                    "id": "plugin_items_list_custom_plugin_subscription_item",
                    "display": "Plugin Items",
                    "type": "list.custom.plugincommissionitem"
                },
                {
                    "id": "template_items_list_custom_template_commission_item",
                    "display": "Template Items",
                    "type": "list.custom.templatecommissionitem"
                },
                {
                    "id": "total_number",
                    "display": "Total",
                    "type": "number"
                },
                {
                    "id": "type_text",
                    "display": "type",
                    "type": "text"
                },
                {
                    "id": "user_user",
                    "display": "User",
                    "type": "user"
                },
                {
                    "id": "Created Date",
                    "display": "Created Date",
                    "type": "date"
                },
                {
                    "id": "Modified Date",
                    "display": "Modified Date",
                    "type": "date"
                },
                {
                    "id": "Created By",
                    "display": "Created By",
                    "type": "user"
                },
                {
                    "id": "_id",
                    "display": "unique ID",
                    "type": "text"
                },
                {
                    "id": "Slug",
                    "display": "Slug",
                    "type": "text"
                }
            ]
        },
        "credittransaction": {
            "display": "Credit Transaction",
            "fields": [
                {
                    "id": "amount_number",
                    "display": "Delta",
                    "type": "number"
                },
                {
                    "id": "ending_balance_number",
                    "display": "Ending balance",
                    "type": "number"
                },
                {
                    "id": "source_text",
                    "display": "Source",
                    "type": "text"
                },
                {
                    "id": "starting_balance_number",
                    "display": "Starting balance",
                    "type": "number"
                },
                {
                    "id": "stripe_invoice_id_text",
                    "display": "Stripe invoice_id",
                    "type": "text"
                },
                {
                    "id": "user_user",
                    "display": "User",
                    "type": "user"
                },
                {
                    "id": "Created Date",
                    "display": "Created Date",
                    "type": "date"
                },
                {
                    "id": "Modified Date",
                    "display": "Modified Date",
                    "type": "date"
                },
                {
                    "id": "Created By",
                    "display": "Created By",
                    "type": "user"
                },
                {
                    "id": "_id",
                    "display": "unique ID",
                    "type": "text"
                },
                {
                    "id": "Slug",
                    "display": "Slug",
                    "type": "text"
                }
            ]
        },
        "debug": {
            "display": "Debug",
            "fields": [
                {
                    "id": "address__text__text",
                    "display": "Text 1",
                    "type": "text"
                },
                {
                    "id": "boolean_2_boolean",
                    "display": "Boolean 2",
                    "type": "boolean"
                },
                {
                    "id": "boolean_boolean",
                    "display": "Boolean 1",
                    "type": "boolean"
                },
                {
                    "id": "customer_id_text",
                    "display": "Text 2",
                    "type": "text"
                },
                {
                    "id": "email_text",
                    "display": "Text 3",
                    "type": "text"
                },
                {
                    "id": "end_date_date",
                    "display": "Date 1",
                    "type": "date"
                },
                {
                    "id": "end_sub_scheduled__boolean",
                    "display": "End Sub Scheduled?",
                    "type": "boolean"
                },
                {
                    "id": "event_name_text",
                    "display": "Text 4",
                    "type": "text"
                },
                {
                    "id": "list_of_texts_1_list_text",
                    "display": "List of texts 1",
                    "type": "list.text"
                },
                {
                    "id": "meta_release_option_meta_release",
                    "display": "Meta Release",
                    "type": "option.meta_release"
                },
                {
                    "id": "number_1_number",
                    "display": "Number 1",
                    "type": "number"
                },
                {
                    "id": "number_2_number",
                    "display": "Number 2",
                    "type": "number"
                },
                {
                    "id": "number_3_number",
                    "display": "Number 3",
                    "type": "number"
                },
                {
                    "id": "plan_text",
                    "display": "Text 5",
                    "type": "text"
                },
                {
                    "id": "processed__boolean",
                    "display": "Processed?",
                    "type": "boolean"
                },
                {
                    "id": "start_date_date",
                    "display": "Date 2",
                    "type": "date"
                },
                {
                    "id": "subscription_id__raw__text",
                    "display": "Text 6",
                    "type": "text"
                },
                {
                    "id": "subscription_status_text",
                    "display": "Text 7",
                    "type": "text"
                },
                {
                    "id": "text_10_text",
                    "display": "Text 10",
                    "type": "text"
                },
                {
                    "id": "text_11_text",
                    "display": "Text 11",
                    "type": "text"
                },
                {
                    "id": "text_12_text",
                    "display": "Text 12",
                    "type": "text"
                },
                {
                    "id": "text_13_text",
                    "display": "Text 13",
                    "type": "text"
                },
                {
                    "id": "text_14_text",
                    "display": "Text 14",
                    "type": "text"
                },
                {
                    "id": "text_15_text",
                    "display": "Text 15",
                    "type": "text"
                },
                {
                    "id": "text_16_text",
                    "display": "Text 16",
                    "type": "text"
                },
                {
                    "id": "text_17_text",
                    "display": "Text 17",
                    "type": "text"
                },
                {
                    "id": "text_9_text",
                    "display": "Text 9",
                    "type": "text"
                },
                {
                    "id": "user_1_user",
                    "display": "User 1",
                    "type": "user"
                },
                {
                    "id": "user_id_text",
                    "display": "Text 8",
                    "type": "text"
                },
                {
                    "id": "Created Date",
                    "display": "Created Date",
                    "type": "date"
                },
                {
                    "id": "Modified Date",
                    "display": "Modified Date",
                    "type": "date"
                },
                {
                    "id": "Created By",
                    "display": "Created By",
                    "type": "user"
                },
                {
                    "id": "_id",
                    "display": "unique ID",
                    "type": "text"
                },
                {
                    "id": "Slug",
                    "display": "Slug",
                    "type": "text"
                }
            ]
        },
        "featurerequest": {
            "display": "Feature Request",
            "fields": [
                {
                    "id": "bubble_reply_date_date",
                    "display": "Bubble Reply Date",
                    "type": "date"
                },
                {
                    "id": "bubble_reply_text",
                    "display": "Bubble reply",
                    "type": "text"
                },
                {
                    "id": "frequency_text",
                    "display": "Frequency",
                    "type": "text"
                },
                {
                    "id": "launch_date_date",
                    "display": "Launch date",
                    "type": "date"
                },
                {
                    "id": "long_description_text",
                    "display": "Long description",
                    "type": "text"
                },
                {
                    "id": "merged_into_custom_feature_request",
                    "display": "Merged into",
                    "type": "custom.featurerequest"
                },
                {
                    "id": "product_area_option_product_area",
                    "display": "Product area",
                    "type": "option.product_area"
                },
                {
                    "id": "status_text",
                    "display": "Status",
                    "type": "text"
                },
                {
                    "id": "submitted_by_bot_boolean",
                    "display": "Submitted by Bot",
                    "type": "boolean"
                },
                {
                    "id": "summary_description_text",
                    "display": "Summary description",
                    "type": "text"
                },
                {
                    "id": "upvote_count_number",
                    "display": "Upvote count",
                    "type": "number"
                },
                {
                    "id": "upvoter_list_user",
                    "display": "Upvoters",
                    "type": "list.user"
                },
                {
                    "id": "urgency_text",
                    "display": "Urgency",
                    "type": "text"
                },
                {
                    "id": "Created Date",
                    "display": "Created Date",
                    "type": "date"
                },
                {
                    "id": "Modified Date",
                    "display": "Modified Date",
                    "type": "date"
                },
                {
                    "id": "Created By",
                    "display": "Created By",
                    "type": "user"
                },
                {
                    "id": "_id",
                    "display": "unique ID",
                    "type": "text"
                },
                {
                    "id": "Slug",
                    "display": "Slug",
                    "type": "text"
                }
            ]
        },
        "fileupload": {
            "display": "File upload",
            "fields": [
                {
                    "id": "app_version_text",
                    "display": "app_version",
                    "type": "text"
                },
                {
                    "id": "appname_text",
                    "display": "appname",
                    "type": "text"
                },
                {
                    "id": "attach_to_text",
                    "display": "attach_to",
                    "type": "text"
                },
                {
                    "id": "content_type_text",
                    "display": "content_type",
                    "type": "text"
                },
                {
                    "id": "date_date",
                    "display": "date",
                    "type": "date"
                },
                {
                    "id": "deleted_app_id_text",
                    "display": "deleted_app_id",
                    "type": "text"
                },
                {
                    "id": "filename_text",
                    "display": "filename",
                    "type": "text"
                },
                {
                    "id": "s3_key_text",
                    "display": "s3_key",
                    "type": "text"
                },
                {
                    "id": "size_number",
                    "display": "size",
                    "type": "number"
                },
                {
                    "id": "temp_db_text",
                    "display": "temp_db",
                    "type": "text"
                },
                {
                    "id": "user_id_text",
                    "display": "user_id",
                    "type": "text"
                },
                {
                    "id": "Created Date",
                    "display": "Created Date",
                    "type": "date"
                },
                {
                    "id": "Modified Date",
                    "display": "Modified Date",
                    "type": "date"
                },
                {
                    "id": "Created By",
                    "display": "Created By",
                    "type": "user"
                },
                {
                    "id": "_id",
                    "display": "unique ID",
                    "type": "text"
                },
                {
                    "id": "Slug",
                    "display": "Slug",
                    "type": "text"
                }
            ]
        },
        "invoice": {
            "display": "Invoice",
            "fields": [
                {
                    "id": "amount_number",
                    "display": "Amount",
                    "type": "number"
                },
                {
                    "id": "appname_text",
                    "display": "appname",
                    "type": "text"
                },
                {
                    "id": "business_address_text",
                    "display": "Business address",
                    "type": "text"
                },
                {
                    "id": "business_name_text",
                    "display": "Business name",
                    "type": "text"
                },
                {
                    "id": "can_cancel_now_boolean",
                    "display": "can_cancel_now",
                    "type": "boolean"
                },
                {
                    "id": "card_last_digit_text",
                    "display": "Card last digit",
                    "type": "text"
                },
                {
                    "id": "charge_id_text",
                    "display": "charge id",
                    "type": "text"
                },
                {
                    "id": "charge_type_text",
                    "display": "charge type",
                    "type": "text"
                },
                {
                    "id": "currency_text",
                    "display": "Currency",
                    "type": "text"
                },
                {
                    "id": "description_text",
                    "display": "description",
                    "type": "text"
                },
                {
                    "id": "detail_text",
                    "display": "detail",
                    "type": "text"
                },
                {
                    "id": "discount_api_stripe_Coupon",
                    "display": "Discount",
                    "type": "api.stripe.Coupon"
                },
                {
                    "id": "disputed_boolean",
                    "display": "Disputed",
                    "type": "boolean"
                },
                {
                    "id": "ending_balance_number",
                    "display": "Ending balance",
                    "type": "number"
                },
                {
                    "id": "first_for_this_subscription_boolean",
                    "display": "first for this subscription",
                    "type": "boolean"
                },
                {
                    "id": "invoice_id_text",
                    "display": "invoice id",
                    "type": "text"
                },
                {
                    "id": "invoice_items_list_api_stripe_InvoiceItem",
                    "display": "Invoice items",
                    "type": "list.api.stripe.InvoiceItem"
                },
                {
                    "id": "month_year_text",
                    "display": "month year",
                    "type": "text"
                },
                {
                    "id": "number_text",
                    "display": "Number",
                    "type": "text"
                },
                {
                    "id": "overage_item_custom_ovearge_item",
                    "display": "Overage Item",
                    "type": "custom.overageitem"
                },
                {
                    "id": "pdf_file_file",
                    "display": "PDF File",
                    "type": "file"
                },
                {
                    "id": "presentment_amount_number",
                    "display": "Presentment amount",
                    "type": "number"
                },
                {
                    "id": "presentment_currency_text",
                    "display": "Presentment currency",
                    "type": "text"
                },
                {
                    "id": "refunded_amount_number",
                    "display": "Refunded amount",
                    "type": "number"
                },
                {
                    "id": "refunded_boolean",
                    "display": "Refunded",
                    "type": "boolean"
                },
                {
                    "id": "starting_balance_number",
                    "display": "Starting balance",
                    "type": "number"
                },
                {
                    "id": "statement_text",
                    "display": "statement",
                    "type": "text"
                },
                {
                    "id": "sub_total_number",
                    "display": "Sub total",
                    "type": "number"
                },
                {
                    "id": "subscription_id_text",
                    "display": "subscription ID",
                    "type": "text"
                },
                {
                    "id": "tax_id_text",
                    "display": "Tax ID",
                    "type": "text"
                },
                {
                    "id": "tax_id_type_text",
                    "display": "Tax ID Type",
                    "type": "text"
                },
                {
                    "id": "tax_number",
                    "display": "Tax",
                    "type": "number"
                },
                {
                    "id": "total_number",
                    "display": "total",
                    "type": "number"
                },
                {
                    "id": "trial__boolean",
                    "display": "trial?",
                    "type": "boolean"
                },
                {
                    "id": "type_option_invoice_type",
                    "display": "Type",
                    "type": "option.invoice_type"
                },
                {
                    "id": "url_text",
                    "display": "URL",
                    "type": "text"
                },
                {
                    "id": "user_email_text",
                    "display": "user email",
                    "type": "text"
                },
                {
                    "id": "user_user",
                    "display": "user",
                    "type": "user"
                },
                {
                    "id": "workload_credits_list_custom_wc",
                    "display": "Workload Credits",
                    "type": "list.custom.workloadcredit"
                },
                {
                    "id": "Created Date",
                    "display": "Created Date",
                    "type": "date"
                },
                {
                    "id": "Modified Date",
                    "display": "Modified Date",
                    "type": "date"
                },
                {
                    "id": "Created By",
                    "display": "Created By",
                    "type": "user"
                },
                {
                    "id": "_id",
                    "display": "unique ID",
                    "type": "text"
                },
                {
                    "id": "Slug",
                    "display": "Slug",
                    "type": "text"
                }
            ]
        },
        "zenterpriseprice": {
            "display": "zEnterprise Price",
            "fields": [
                {
                    "id": "additional_capacity_number",
                    "display": "Initial additional capacity",
                    "type": "number"
                },
                {
                    "id": "app_name_text",
                    "display": "App name",
                    "type": "text"
                },
                {
                    "id": "db_things_chunk_price_number",
                    "display": "DB things chunk price",
                    "type": "number"
                },
                {
                    "id": "db_things_chunk_size_number",
                    "display": "DB things chunk size",
                    "type": "number"
                },
                {
                    "id": "db_things_threshold_number",
                    "display": "DB things threshold",
                    "type": "number"
                },
                {
                    "id": "is_dedicated__boolean",
                    "display": "Is dedicated?",
                    "type": "boolean"
                },
                {
                    "id": "mudv_chunk_price_number",
                    "display": "MUDV chunk price",
                    "type": "number"
                },
                {
                    "id": "mudv_chunk_size_number",
                    "display": "MUDV chunk size",
                    "type": "number"
                },
                {
                    "id": "mudv_threshold_number",
                    "display": "MUDV threshold",
                    "type": "number"
                },
                {
                    "id": "subscription_id_text",
                    "display": "Subscription ID",
                    "type": "text"
                },
                {
                    "id": "user_email_text",
                    "display": "User email",
                    "type": "text"
                },
                {
                    "id": "Created Date",
                    "display": "Created Date",
                    "type": "date"
                },
                {
                    "id": "Modified Date",
                    "display": "Modified Date",
                    "type": "date"
                },
                {
                    "id": "Created By",
                    "display": "Created By",
                    "type": "user"
                },
                {
                    "id": "_id",
                    "display": "unique ID",
                    "type": "text"
                },
                {
                    "id": "Slug",
                    "display": "Slug",
                    "type": "text"
                }
            ]
        },
        "organization": {
            "display": "Organization",
            "fields": [
                {
                    "id": "_age__agency_size_option_agency_size",
                    "display": "(AGE) Agency Size",
                    "type": "option.agency_size"
                },
                {
                    "id": "_age__agency_tier_number_number",
                    "display": "(AGE) Agency tier number",
                    "type": "number"
                },
                {
                    "id": "_age__agency_tier_option_agency_tier",
                    "display": "(AGE) Agency Tier",
                    "type": "option.agency_tier"
                },
                {
                    "id": "_age__agreed_to_terms_date_date",
                    "display": "(AGE) Agreed to terms date",
                    "type": "date"
                },
                {
                    "id": "_age__booking_link_text",
                    "display": "(AGE) Booking Link",
                    "type": "text"
                },
                {
                    "id": "_age__cover_image_image",
                    "display": "(AGE) Cover image",
                    "type": "image"
                },
                {
                    "id": "_age__created_date__public__date",
                    "display": "(AGE) Created date (public)",
                    "type": "date"
                },
                {
                    "id": "_age__description_long_text",
                    "display": "(AGE) Description long",
                    "type": "text"
                },
                {
                    "id": "_age__developers_list_user",
                    "display": "(AGE) Developers",
                    "type": "list.user"
                },
                {
                    "id": "_age__languages_list_text",
                    "display": "(AGE) Languages",
                    "type": "list.text"
                },
                {
                    "id": "_age__list_of_locations__geo__list_geographic_address",
                    "display": "(AGE) List of locations (geo)",
                    "type": "list.geographic_address"
                },
                {
                    "id": "_age__list_of_locations__text__list_text",
                    "display": "(AGE) List of locations (text)",
                    "type": "list.text"
                },
                {
                    "id": "_age__members__previous__list_user",
                    "display": "(AGE) Members (previous)",
                    "type": "list.user"
                },
                {
                    "id": "_age__milestones_dismissed_users_list_user",
                    "display": "(AGE) Milestones dismissed Users",
                    "type": "list.user"
                },
                {
                    "id": "_age__primary_services_list_option_rfp_services",
                    "display": "(AGE) Primary services",
                    "type": "list.option.rfp_services"
                },
                {
                    "id": "_age__process_image_image",
                    "display": "(AGE) Process image",
                    "type": "image"
                },
                {
                    "id": "_age__process_video_file",
                    "display": "(AGE) Process video",
                    "type": "file"
                },
                {
                    "id": "_age__process_video_thumbnail_image",
                    "display": "(AGE) Process video thumbnail",
                    "type": "image"
                },
                {
                    "id": "_age__process_video_title_text",
                    "display": "(AGE) Process video title",
                    "type": "text"
                },
                {
                    "id": "_age__profile_active__boolean",
                    "display": "z(AGE) Profile active?",
                    "type": "boolean"
                },
                {
                    "id": "_age__profile_links_list_custom_custom_link",
                    "display": "(AGE) Profile links",
                    "type": "list.custom.agencyexternalprofilelink"
                },
                {
                    "id": "_age__projects_list_custom_agency_project",
                    "display": "(AGE) Projects",
                    "type": "list.custom.agencyproject"
                },
                {
                    "id": "_age__public_contact_email_text",
                    "display": "(AGE) Public contact email",
                    "type": "text"
                },
                {
                    "id": "_age__rank_number",
                    "display": "(AGE) Rank",
                    "type": "number"
                },
                {
                    "id": "_age__review_embed_id_text",
                    "display": "(AGE) Review embed ID",
                    "type": "text"
                },
                {
                    "id": "_age__search_hash__locations__text",
                    "display": "(AGE) Search hash (locations)",
                    "type": "text"
                },
                {
                    "id": "_age__search_hash_text",
                    "display": "(AGE) Search hash",
                    "type": "text"
                },
                {
                    "id": "_age__services_list_option_rfp_services",
                    "display": "(AGE) Services",
                    "type": "list.option.rfp_services"
                },
                {
                    "id": "_age__starting_price__hourly__number",
                    "display": "(AGE) Starting price (Hourly)",
                    "type": "number"
                },
                {
                    "id": "_age__starting_price__project__number",
                    "display": "(AGE) Starting price (project)",
                    "type": "number"
                },
                {
                    "id": "_age__starting_rate_types_list_option_rfp_budget_type",
                    "display": "(AGE) Starting rate types",
                    "type": "list.option.rfp_budget_type"
                },
                {
                    "id": "_age__steps_completed_number",
                    "display": "(AGE) Steps Completed",
                    "type": "number"
                },
                {
                    "id": "_age__user_agreed_to_terms_user",
                    "display": "(AGE) Agreed to terms User",
                    "type": "user"
                },
                {
                    "id": "_age__viewed_rfp_settings__boolean",
                    "display": "(AGE) Viewed RFP Settings?",
                    "type": "boolean"
                },
                {
                    "id": "_ent__organization_id_text",
                    "display": "(ENT) WorkOS ID",
                    "type": "text"
                },
                {
                    "id": "_org__agency_size_option_rfp_agency_sizes",
                    "display": "(ORG) Agency size",
                    "type": "option.rfp_agency_sizes"
                },
                {
                    "id": "_org__owner_user",
                    "display": "(ORG) Owner",
                    "type": "user"
                },
                {
                    "id": "admin_users_list_user",
                    "display": "(AGE) Admin Users",
                    "type": "list.user"
                },
                {
                    "id": "agency_status_option_agency_status",
                    "display": "(AGE) Agency Status",
                    "type": "option.agency_status"
                },
                {
                    "id": "authorized_emails_list_text",
                    "display": "(ENT) Authorized emails",
                    "type": "list.text"
                },
                {
                    "id": "converted_apps_list_text",
                    "display": "(AGE) Converted apps",
                    "type": "list.text"
                },
                {
                    "id": "emails_list_text",
                    "display": "(AGE) Emails",
                    "type": "list.text"
                },
                {
                    "id": "hidden_boolean",
                    "display": "(AGE) Hidden",
                    "type": "boolean"
                },
                {
                    "id": "logo_image",
                    "display": "(AGE) Logo",
                    "type": "image"
                },
                {
                    "id": "member_size_number",
                    "display": "(AGE) Member size",
                    "type": "number"
                },
                {
                    "id": "members_list_user",
                    "display": "(ORG) Members",
                    "type": "list.user"
                },
                {
                    "id": "name_text",
                    "display": "(ORG) Name",
                    "type": "text"
                },
                {
                    "id": "number_converted_apps_number",
                    "display": "(AGE) Number converted apps",
                    "type": "number"
                },
                {
                    "id": "paying_user_user",
                    "display": "(ORG) Paying User",
                    "type": "user"
                },
                {
                    "id": "receive_rfp_boolean",
                    "display": "(AGE) Receive RFP",
                    "type": "boolean"
                },
                {
                    "id": "rfp_budget_types_list_option_rfp_budget_type",
                    "display": "(AGE) RFP Budget Types",
                    "type": "list.option.rfp_budget_type"
                },
                {
                    "id": "rfp_description_text",
                    "display": "(AGE) Description short",
                    "type": "text"
                },
                {
                    "id": "rfp_min_fixed_fee_number",
                    "display": "(AGE) RFP min fixed fee",
                    "type": "number"
                },
                {
                    "id": "rfp_min_hourly_fee_number",
                    "display": "(AGE) RFP min hourly fee",
                    "type": "number"
                },
                {
                    "id": "rfp_project_types_list_option_rfp_project_type",
                    "display": "(AGE) RFP Project Types",
                    "type": "list.option.rfp_project_type"
                },
                {
                    "id": "rfp_scope_sizes_list_option_rfp_scope_size",
                    "display": "(AGE) RFP Scope Sizes",
                    "type": "list.option.rfp_scope_size"
                },
                {
                    "id": "rfp_users_list_user",
                    "display": "(AGE) RFP Users",
                    "type": "list.user"
                },
                {
                    "id": "seat_limit_number",
                    "display": "(ENT) Seat limit",
                    "type": "number"
                },
                {
                    "id": "sso_enabled__boolean",
                    "display": "(ENT) SSO enabled?",
                    "type": "boolean"
                },
                {
                    "id": "stripe_plan_text",
                    "display": "(AGE) Stripe plan",
                    "type": "text"
                },
                {
                    "id": "subscription_id_text",
                    "display": "(ORG) Subscription ID",
                    "type": "text"
                },
                {
                    "id": "type__os__option_organization_types",
                    "display": "(ORG) Type (OS)",
                    "type": "option.organization_types"
                },
                {
                    "id": "type_text",
                    "display": "(ORG) Type",
                    "type": "text"
                },
                {
                    "id": "website_text",
                    "display": "(AGE) Website",
                    "type": "text"
                },
                {
                    "id": "Created Date",
                    "display": "Created Date",
                    "type": "date"
                },
                {
                    "id": "Modified Date",
                    "display": "Modified Date",
                    "type": "date"
                },
                {
                    "id": "Created By",
                    "display": "Created By",
                    "type": "user"
                },
                {
                    "id": "_id",
                    "display": "unique ID",
                    "type": "text"
                },
                {
                    "id": "Slug",
                    "display": "Slug",
                    "type": "text"
                }
            ]
        },
        "perkactivation": {
            "display": "Perk activation",
            "fields": [
                {
                    "id": "amount_expired_number",
                    "display": "Amount expired",
                    "type": "number"
                },
                {
                    "id": "amount_number",
                    "display": "Amount",
                    "type": "number"
                },
                {
                    "id": "end_date_date",
                    "display": "End date",
                    "type": "date"
                },
                {
                    "id": "perk_custom_perk_program",
                    "display": "Perk",
                    "type": "custom.perkprogram"
                },
                {
                    "id": "start_date_date",
                    "display": "Start date",
                    "type": "date"
                },
                {
                    "id": "user_user",
                    "display": "User",
                    "type": "user"
                },
                {
                    "id": "Created Date",
                    "display": "Created Date",
                    "type": "date"
                },
                {
                    "id": "Modified Date",
                    "display": "Modified Date",
                    "type": "date"
                },
                {
                    "id": "Created By",
                    "display": "Created By",
                    "type": "user"
                },
                {
                    "id": "_id",
                    "display": "unique ID",
                    "type": "text"
                },
                {
                    "id": "Slug",
                    "display": "Slug",
                    "type": "text"
                }
            ]
        },
        "perkprogram": {
            "display": "Perk program",
            "fields": [
                {
                    "id": "bootcamp_discount_number",
                    "display": "Bootcamp Discount",
                    "type": "number"
                },
                {
                    "id": "cap_number",
                    "display": "Cap",
                    "type": "number"
                },
                {
                    "id": "code_text",
                    "display": "Code",
                    "type": "text"
                },
                {
                    "id": "cohort_number_number",
                    "display": "Cohort number",
                    "type": "number"
                },
                {
                    "id": "contact_name_text",
                    "display": "Contact name",
                    "type": "text"
                },
                {
                    "id": "contact_text",
                    "display": "Contact email",
                    "type": "text"
                },
                {
                    "id": "credit_amount_number",
                    "display": "Credit amount",
                    "type": "number"
                },
                {
                    "id": "description_text",
                    "display": "Description",
                    "type": "text"
                },
                {
                    "id": "duration_number",
                    "display": "Duration",
                    "type": "number"
                },
                {
                    "id": "expiration_date_date",
                    "display": "Expiration Date",
                    "type": "date"
                },
                {
                    "id": "expiration_email_id_text",
                    "display": "Expiration email ID",
                    "type": "text"
                },
                {
                    "id": "location_geographic_address",
                    "display": "Location",
                    "type": "geographic_address"
                },
                {
                    "id": "logo_image",
                    "display": "Logo",
                    "type": "image"
                },
                {
                    "id": "organization_name_text",
                    "display": "Name",
                    "type": "text"
                },
                {
                    "id": "parent_custom_perk_program_parent",
                    "display": "Parent",
                    "type": "custom.perkprogramparent"
                },
                {
                    "id": "public__boolean",
                    "display": "Public?",
                    "type": "boolean"
                },
                {
                    "id": "status_option_perk_program_status",
                    "display": "Status",
                    "type": "option.perk_program_status"
                },
                {
                    "id": "type_option_perk_program_type",
                    "display": "Type",
                    "type": "option.perk_program_type"
                },
                {
                    "id": "usage_number",
                    "display": "Usage",
                    "type": "number"
                },
                {
                    "id": "website_text",
                    "display": "Website",
                    "type": "text"
                },
                {
                    "id": "Created Date",
                    "display": "Created Date",
                    "type": "date"
                },
                {
                    "id": "Modified Date",
                    "display": "Modified Date",
                    "type": "date"
                },
                {
                    "id": "Created By",
                    "display": "Created By",
                    "type": "user"
                },
                {
                    "id": "_id",
                    "display": "unique ID",
                    "type": "text"
                },
                {
                    "id": "Slug",
                    "display": "Slug",
                    "type": "text"
                }
            ]
        },
        "plugincommissionitem": {
            "display": "Plugin Commission Item",
            "fields": [
                {
                    "id": "amount_number",
                    "display": "Paid to seller",
                    "type": "number"
                },
                {
                    "id": "appname_text",
                    "display": "Appname",
                    "type": "text"
                },
                {
                    "id": "buyer_user",
                    "display": "Buyer",
                    "type": "user"
                },
                {
                    "id": "charge_id_text",
                    "display": "Charge ID",
                    "type": "text"
                },
                {
                    "id": "invoice_id_text",
                    "display": "Invoice ID",
                    "type": "text"
                },
                {
                    "id": "one_time_payment_boolean",
                    "display": "One time payment",
                    "type": "boolean"
                },
                {
                    "id": "paid_boolean",
                    "display": "Paid",
                    "type": "boolean"
                },
                {
                    "id": "plugin_custom_plugins",
                    "display": "Plugin",
                    "type": "custom.plugin"
                },
                {
                    "id": "refunded_boolean",
                    "display": "Refunded",
                    "type": "boolean"
                },
                {
                    "id": "seller_user",
                    "display": "Seller",
                    "type": "user"
                },
                {
                    "id": "subscription_id__encrypted__text",
                    "display": "Subscription ID (encrypted)",
                    "type": "text"
                },
                {
                    "id": "subscription_id_text",
                    "display": "Subscription ID",
                    "type": "text"
                },
                {
                    "id": "total_amount_number",
                    "display": "Total amount",
                    "type": "number"
                },
                {
                    "id": "Created Date",
                    "display": "Created Date",
                    "type": "date"
                },
                {
                    "id": "Modified Date",
                    "display": "Modified Date",
                    "type": "date"
                },
                {
                    "id": "Created By",
                    "display": "Created By",
                    "type": "user"
                },
                {
                    "id": "_id",
                    "display": "unique ID",
                    "type": "text"
                },
                {
                    "id": "Slug",
                    "display": "Slug",
                    "type": "text"
                }
            ]
        },
        "plugincommissionpayout": {
            "display": "Plugin Commission Payout",
            "fields": [
                {
                    "id": "amount_number",
                    "display": "Amount",
                    "type": "number"
                },
                {
                    "id": "contributor_receipt_custom_contributor_payout",
                    "display": "Contributor Payout",
                    "type": "custom.contributorpayout"
                },
                {
                    "id": "items_list_custom_plugin_subscription_item",
                    "display": "Items",
                    "type": "list.custom.plugincommissionitem"
                },
                {
                    "id": "month_text",
                    "display": "Month",
                    "type": "text"
                },
                {
                    "id": "payment_id_text",
                    "display": "Payment ID",
                    "type": "text"
                },
                {
                    "id": "seller_user",
                    "display": "Seller",
                    "type": "user"
                },
                {
                    "id": "transfer_id_text",
                    "display": "Transfer ID",
                    "type": "text"
                },
                {
                    "id": "Created Date",
                    "display": "Created Date",
                    "type": "date"
                },
                {
                    "id": "Modified Date",
                    "display": "Modified Date",
                    "type": "date"
                },
                {
                    "id": "Created By",
                    "display": "Created By",
                    "type": "user"
                },
                {
                    "id": "_id",
                    "display": "unique ID",
                    "type": "text"
                },
                {
                    "id": "Slug",
                    "display": "Slug",
                    "type": "text"
                }
            ]
        },
        "plugin": {
            "display": "Plugin",
            "fields": [
                {
                    "id": "all_versions_rating_number",
                    "display": "all versions rating",
                    "type": "number"
                },
                {
                    "id": "authorized_apps_list_text",
                    "display": "authorized_apps",
                    "type": "list.text"
                },
                {
                    "id": "blocked_boolean",
                    "display": "blocked",
                    "type": "boolean"
                },
                {
                    "id": "categories_list_text",
                    "display": "categories",
                    "type": "list.text"
                },
                {
                    "id": "data_tracked__boolean",
                    "display": "Data tracked?",
                    "type": "boolean"
                },
                {
                    "id": "data_tracked__text__text",
                    "display": "Data tracked (text)",
                    "type": "text"
                },
                {
                    "id": "data_tracked_description_text",
                    "display": "Data tracked description",
                    "type": "text"
                },
                {
                    "id": "deleted_boolean",
                    "display": "Deleted",
                    "type": "boolean"
                },
                {
                    "id": "demo_page_text",
                    "display": "Demo page",
                    "type": "text"
                },
                {
                    "id": "deprecated_versions_list_text",
                    "display": "Deprecated versions",
                    "type": "list.text"
                },
                {
                    "id": "description_text",
                    "display": "Description",
                    "type": "text"
                },
                {
                    "id": "featured__boolean",
                    "display": "Featured?",
                    "type": "boolean"
                },
                {
                    "id": "first_publish_date_date",
                    "display": "first publish date",
                    "type": "date"
                },
                {
                    "id": "forked_parent_custom_plugins",
                    "display": "forked_parent",
                    "type": "custom.plugin"
                },
                {
                    "id": "git_repo_default_branch_name_text",
                    "display": "git_repo_default_branch_name",
                    "type": "text"
                },
                {
                    "id": "git_repo_owner_text",
                    "display": "git_repo_owner",
                    "type": "text"
                },
                {
                    "id": "git_repo_text",
                    "display": "git_repo",
                    "type": "text"
                },
                {
                    "id": "git_repo_url_text",
                    "display": "git_repo_url",
                    "type": "text"
                },
                {
                    "id": "hardcoded__boolean",
                    "display": "hardcoded?",
                    "type": "boolean"
                },
                {
                    "id": "hidden_by_admin_boolean",
                    "display": "Hidden",
                    "type": "boolean"
                },
                {
                    "id": "hidden_for_marketing_boolean",
                    "display": "Hidden for marketing",
                    "type": "boolean"
                },
                {
                    "id": "image_image",
                    "display": "Image",
                    "type": "image"
                },
                {
                    "id": "instructions_text",
                    "display": "Instructions",
                    "type": "text"
                },
                {
                    "id": "is_node14_boolean",
                    "display": "is_node14",
                    "type": "boolean"
                },
                {
                    "id": "last_git_commit_text",
                    "display": "last_git_commit",
                    "type": "text"
                },
                {
                    "id": "last_version_rating_number",
                    "display": "last version rating",
                    "type": "number"
                },
                {
                    "id": "last_version_text",
                    "display": "Last version",
                    "type": "text"
                },
                {
                    "id": "licence_text",
                    "display": "Licence",
                    "type": "text"
                },
                {
                    "id": "link_text",
                    "display": "link",
                    "type": "text"
                },
                {
                    "id": "marketplace_eligible__boolean",
                    "display": "Marketplace enabled?",
                    "type": "boolean"
                },
                {
                    "id": "modfied_after_git_commit_boolean",
                    "display": "modfied_after_git_commit",
                    "type": "boolean"
                },
                {
                    "id": "mp_profile_processed__boolean",
                    "display": "mp Profile Processed?",
                    "type": "boolean"
                },
                {
                    "id": "name_text",
                    "display": "Name",
                    "type": "text"
                },
                {
                    "id": "number_of_submits_number",
                    "display": "Number of Submits",
                    "type": "number"
                },
                {
                    "id": "official_badge_boolean",
                    "display": "Official badge",
                    "type": "boolean"
                },
                {
                    "id": "one_time_price_number",
                    "display": "one_time_price",
                    "type": "number"
                },
                {
                    "id": "other_owners_list_user",
                    "display": "Other owners",
                    "type": "list.user"
                },
                {
                    "id": "owner_user",
                    "display": "Owner",
                    "type": "user"
                },
                {
                    "id": "payment_type_text",
                    "display": "payment_type",
                    "type": "text"
                },
                {
                    "id": "pending_data_tracked_boolean",
                    "display": "pending_data_tracked",
                    "type": "boolean"
                },
                {
                    "id": "pending_data_tracked_description_text",
                    "display": "pending_data_tracked_description",
                    "type": "text"
                },
                {
                    "id": "pending_version_text",
                    "display": "pending version",
                    "type": "text"
                },
                {
                    "id": "platforms_list_text",
                    "display": "zplatforms",
                    "type": "list.text"
                },
                {
                    "id": "platforms_new_list_text",
                    "display": "platforms_new",
                    "type": "list.text"
                },
                {
                    "id": "price_number",
                    "display": "Price",
                    "type": "number"
                },
                {
                    "id": "private_data_text",
                    "display": "private_data",
                    "type": "text"
                },
                {
                    "id": "published_commercial_boolean",
                    "display": "Published Commercial",
                    "type": "boolean"
                },
                {
                    "id": "published_open_source_boolean",
                    "display": "Published open source",
                    "type": "boolean"
                },
                {
                    "id": "pv_number",
                    "display": "pv",
                    "type": "number"
                },
                {
                    "id": "show_as_integration_boolean",
                    "display": "Show as integration",
                    "type": "boolean"
                },
                {
                    "id": "test_appname_text",
                    "display": "test appname",
                    "type": "text"
                },
                {
                    "id": "types_by_platform_list_text",
                    "display": "types_by_platform",
                    "type": "list.text"
                },
                {
                    "id": "types_list_text",
                    "display": "types",
                    "type": "list.text"
                },
                {
                    "id": "usage_count_number",
                    "display": "usage count",
                    "type": "number"
                },
                {
                    "id": "version_history_text",
                    "display": "Version history",
                    "type": "text"
                },
                {
                    "id": "version_number",
                    "display": "version",
                    "type": "number"
                },
                {
                    "id": "versions_list_text",
                    "display": "Versions",
                    "type": "list.text"
                },
                {
                    "id": "Created Date",
                    "display": "Created Date",
                    "type": "date"
                },
                {
                    "id": "Modified Date",
                    "display": "Modified Date",
                    "type": "date"
                },
                {
                    "id": "Created By",
                    "display": "Created By",
                    "type": "user"
                },
                {
                    "id": "_id",
                    "display": "unique ID",
                    "type": "text"
                },
                {
                    "id": "Slug",
                    "display": "Slug",
                    "type": "text"
                }
            ]
        },
        "rfp": {
            "display": "RFP",
            "fields": [
                {
                    "id": "additional_files_list_file",
                    "display": "Additional files",
                    "type": "list.file"
                },
                {
                    "id": "agency_size_preference_option_rfp_agency_sizes",
                    "display": "Agency size preference",
                    "type": "option.rfp_agency_sizes"
                },
                {
                    "id": "agency_suggestions_list_custom_rfp_agency_suggestion",
                    "display": "All Agency Suggestions",
                    "type": "list.custom.rfpagencysuggestion"
                },
                {
                    "id": "budget__min__number",
                    "display": "zBudget (min)",
                    "type": "number"
                },
                {
                    "id": "budget__os__option_rfp_budget_ranges",
                    "display": "Budget (OS)",
                    "type": "option.rfp_budget_ranges"
                },
                {
                    "id": "budget_number",
                    "display": "zBudget (max)",
                    "type": "number"
                },
                {
                    "id": "closed__boolean",
                    "display": "Closed?",
                    "type": "boolean"
                },
                {
                    "id": "company_name_text",
                    "display": "Company Name",
                    "type": "text"
                },
                {
                    "id": "company_size_text",
                    "display": "Company Size",
                    "type": "text"
                },
                {
                    "id": "company_text",
                    "display": "zCompany",
                    "type": "text"
                },
                {
                    "id": "count___suggestions_max_number",
                    "display": "Count - Suggestions Min",
                    "type": "number"
                },
                {
                    "id": "countries_list_text",
                    "display": "zCountries",
                    "type": "list.text"
                },
                {
                    "id": "deadline_date",
                    "display": "Deadline",
                    "type": "date"
                },
                {
                    "id": "description_text",
                    "display": "Description",
                    "type": "text"
                },
                {
                    "id": "design_files_list_file",
                    "display": "Design files",
                    "type": "list.file"
                },
                {
                    "id": "direct_mode__boolean",
                    "display": "Direct mode?",
                    "type": "boolean"
                },
                {
                    "id": "direct_mode_agency_custom_organization",
                    "display": "Direct mode agency",
                    "type": "custom.organization"
                },
                {
                    "id": "email_text",
                    "display": "Email",
                    "type": "text"
                },
                {
                    "id": "example_rfp__boolean",
                    "display": "Example RFP?",
                    "type": "boolean"
                },
                {
                    "id": "existing_project_link_text",
                    "display": "Existing project link",
                    "type": "text"
                },
                {
                    "id": "figma_link_text",
                    "display": "Figma link",
                    "type": "text"
                },
                {
                    "id": "first_name_text",
                    "display": "First name",
                    "type": "text"
                },
                {
                    "id": "generating_matches__boolean",
                    "display": "Generating matches?",
                    "type": "boolean"
                },
                {
                    "id": "industry_text",
                    "display": "Industry",
                    "type": "text"
                },
                {
                    "id": "last_name_text",
                    "display": "Last name",
                    "type": "text"
                },
                {
                    "id": "linkedin_profile_text",
                    "display": "LinkedIn Profile",
                    "type": "text"
                },
                {
                    "id": "location_geographic_address",
                    "display": "Location",
                    "type": "geographic_address"
                },
                {
                    "id": "match_end_time_date",
                    "display": "Match end time",
                    "type": "date"
                },
                {
                    "id": "match_start_time_date",
                    "display": "Match start time",
                    "type": "date"
                },
                {
                    "id": "organizations_matched_count_number",
                    "display": "zOrganizations matched count",
                    "type": "number"
                },
                {
                    "id": "organizations_matched_list_custom_organization",
                    "display": "zOrganizations matched",
                    "type": "list.custom.organization"
                },
                {
                    "id": "outcome_agency___custom_organization",
                    "display": "Outcome Agency â†©",
                    "type": "custom.organization"
                },
                {
                    "id": "outcome_explanation_text",
                    "display": "Outcome Explanation",
                    "type": "text"
                },
                {
                    "id": "outcome_text",
                    "display": "Outcome",
                    "type": "text"
                },
                {
                    "id": "owner_user_user",
                    "display": "Owner User",
                    "type": "user"
                },
                {
                    "id": "preferred_language_text",
                    "display": "Preferred language",
                    "type": "text"
                },
                {
                    "id": "recipient_option_rfp_recipient",
                    "display": "Recipient",
                    "type": "option.rfp_recipient"
                },
                {
                    "id": "reference_id_text",
                    "display": "Reference ID",
                    "type": "text"
                },
                {
                    "id": "responses_count_number",
                    "display": "Responses Count",
                    "type": "number"
                },
                {
                    "id": "rfp_budget_type_option_rfp_budget_type",
                    "display": "zRFP Budget Type",
                    "type": "option.rfp_budget_type"
                },
                {
                    "id": "rfp_project_type_option_rfp_project_type",
                    "display": "RFP Project Type",
                    "type": "option.rfp_project_type"
                },
                {
                    "id": "rfp_scope_size_option_rfp_scope_size",
                    "display": "RFP Scope Size",
                    "type": "option.rfp_scope_size"
                },
                {
                    "id": "rfp_services_list_option_rfp_services",
                    "display": "RFP Services",
                    "type": "list.option.rfp_services"
                },
                {
                    "id": "rfp_source_option_rfp_source",
                    "display": "RFP Mode",
                    "type": "option.rfp_source"
                },
                {
                    "id": "scored__boolean",
                    "display": "Scored?",
                    "type": "boolean"
                },
                {
                    "id": "selected_agencies_list_custom_organization",
                    "display": "Selected Agencies",
                    "type": "list.custom.organization"
                },
                {
                    "id": "selected_agency_suggestions_list_custom_rfp_agency_suggestion",
                    "display": "Selected Agency Suggestions",
                    "type": "list.custom.rfpagencysuggestion"
                },
                {
                    "id": "spam_score_number",
                    "display": "Spam score",
                    "type": "number"
                },
                {
                    "id": "step_number",
                    "display": "Step",
                    "type": "number"
                },
                {
                    "id": "submitted__boolean",
                    "display": "Submitted?",
                    "type": "boolean"
                },
                {
                    "id": "submitted_date_date",
                    "display": "Submitted date",
                    "type": "date"
                },
                {
                    "id": "timeline_text",
                    "display": "Timeline",
                    "type": "text"
                },
                {
                    "id": "title_text",
                    "display": "Title",
                    "type": "text"
                },
                {
                    "id": "Created Date",
                    "display": "Created Date",
                    "type": "date"
                },
                {
                    "id": "Modified Date",
                    "display": "Modified Date",
                    "type": "date"
                },
                {
                    "id": "Created By",
                    "display": "Created By",
                    "type": "user"
                },
                {
                    "id": "_id",
                    "display": "unique ID",
                    "type": "text"
                },
                {
                    "id": "Slug",
                    "display": "Slug",
                    "type": "text"
                }
            ]
        },
        "rfpagencysuggestion": {
            "display": "RFP Agency Suggestion",
            "fields": [
                {
                    "id": "agency_custom_organization",
                    "display": "Agency",
                    "type": "custom.organization"
                },
                {
                    "id": "budget_number",
                    "display": "Budget",
                    "type": "number"
                },
                {
                    "id": "developer_preference_number",
                    "display": "Developer preference",
                    "type": "number"
                },
                {
                    "id": "language_number",
                    "display": "Language",
                    "type": "number"
                },
                {
                    "id": "location_number",
                    "display": "Location",
                    "type": "number"
                },
                {
                    "id": "processed__boolean",
                    "display": "Processed?",
                    "type": "boolean"
                },
                {
                    "id": "project_size_number",
                    "display": "Project size",
                    "type": "number"
                },
                {
                    "id": "project_type_number",
                    "display": "Project type",
                    "type": "number"
                },
                {
                    "id": "queued__boolean",
                    "display": "Queued?",
                    "type": "boolean"
                },
                {
                    "id": "removed__boolean",
                    "display": "removed?",
                    "type": "boolean"
                },
                {
                    "id": "rfp_custom_rfp",
                    "display": "RFP",
                    "type": "custom.rfp"
                },
                {
                    "id": "services_not_offered_list_option_rfp_services",
                    "display": "Services not offered",
                    "type": "list.option.rfp_services"
                },
                {
                    "id": "services_offered_list_option_rfp_services",
                    "display": "Services offered",
                    "type": "list.option.rfp_services"
                },
                {
                    "id": "set_text",
                    "display": "Set",
                    "type": "text"
                },
                {
                    "id": "total_score_number",
                    "display": "Total Score",
                    "type": "number"
                },
                {
                    "id": "user_user",
                    "display": "User",
                    "type": "user"
                },
                {
                    "id": "Created Date",
                    "display": "Created Date",
                    "type": "date"
                },
                {
                    "id": "Modified Date",
                    "display": "Modified Date",
                    "type": "date"
                },
                {
                    "id": "Created By",
                    "display": "Created By",
                    "type": "user"
                },
                {
                    "id": "_id",
                    "display": "unique ID",
                    "type": "text"
                },
                {
                    "id": "Slug",
                    "display": "Slug",
                    "type": "text"
                }
            ]
        },
        "salescontactsubmission": {
            "display": "Sales Contact Submission",
            "fields": [
                {
                    "id": "agency_name_text",
                    "display": "Agency name",
                    "type": "text"
                },
                {
                    "id": "agency_tier_text",
                    "display": "Agency tier",
                    "type": "text"
                },
                {
                    "id": "area_of_interest_text",
                    "display": "zArea of interest",
                    "type": "text"
                },
                {
                    "id": "company_name_text",
                    "display": "Company name",
                    "type": "text"
                },
                {
                    "id": "company_size_text",
                    "display": "Company size",
                    "type": "text"
                },
                {
                    "id": "country_text",
                    "display": "Country",
                    "type": "text"
                },
                {
                    "id": "email_text",
                    "display": "Email",
                    "type": "text"
                },
                {
                    "id": "experiment_group_text",
                    "display": "zExperiment group",
                    "type": "text"
                },
                {
                    "id": "first_name_text",
                    "display": "First name",
                    "type": "text"
                },
                {
                    "id": "job_title_text",
                    "display": "Job title",
                    "type": "text"
                },
                {
                    "id": "last_name_text",
                    "display": "Last name",
                    "type": "text"
                },
                {
                    "id": "message_text",
                    "display": "Message",
                    "type": "text"
                },
                {
                    "id": "organization_custom_organization",
                    "display": "Organization",
                    "type": "custom.organization"
                },
                {
                    "id": "phone_text",
                    "display": "Phone",
                    "type": "text"
                },
                {
                    "id": "s_i_text",
                    "display": "Customer ID",
                    "type": "text"
                },
                {
                    "id": "source_text",
                    "display": "Source",
                    "type": "text"
                },
                {
                    "id": "Created Date",
                    "display": "Created Date",
                    "type": "date"
                },
                {
                    "id": "Modified Date",
                    "display": "Modified Date",
                    "type": "date"
                },
                {
                    "id": "Created By",
                    "display": "Created By",
                    "type": "user"
                },
                {
                    "id": "_id",
                    "display": "unique ID",
                    "type": "text"
                },
                {
                    "id": "Slug",
                    "display": "Slug",
                    "type": "text"
                }
            ]
        },
        "template": {
            "display": "Template",
            "fields": [
                {
                    "id": "appname_text",
                    "display": "Appname",
                    "type": "text"
                },
                {
                    "id": "category_text",
                    "display": "zCategory",
                    "type": "text"
                },
                {
                    "id": "commercial_price_number",
                    "display": "Price Developer",
                    "type": "number"
                },
                {
                    "id": "community_link_text",
                    "display": "Link Forum",
                    "type": "text"
                },
                {
                    "id": "copy_db_boolean",
                    "display": "copy db",
                    "type": "boolean"
                },
                {
                    "id": "date_submitted_for_review_date",
                    "display": "Date submitted for review",
                    "type": "date"
                },
                {
                    "id": "deleted_boolean",
                    "display": "Deleted",
                    "type": "boolean"
                },
                {
                    "id": "description_text",
                    "display": "Description Long",
                    "type": "text"
                },
                {
                    "id": "documentation_link_text",
                    "display": "Link Documentation",
                    "type": "text"
                },
                {
                    "id": "ease_of_use_option_ease_of_use",
                    "display": "Difficulty Level",
                    "type": "option.ease_of_use"
                },
                {
                    "id": "featured_new_responsive__boolean",
                    "display": "Featured responsive?",
                    "type": "boolean"
                },
                {
                    "id": "features_list_custom_template_features",
                    "display": "Features",
                    "type": "list.custom.templatefeature"
                },
                {
                    "id": "first_publication_date",
                    "display": "First publication",
                    "type": "date"
                },
                {
                    "id": "gallery_list_file",
                    "display": "Gallery",
                    "type": "list.file"
                },
                {
                    "id": "hidden_by_admin_boolean",
                    "display": "Hidden by admin",
                    "type": "boolean"
                },
                {
                    "id": "last_install_date",
                    "display": "Last Install",
                    "type": "date"
                },
                {
                    "id": "license_text",
                    "display": "License",
                    "type": "text"
                },
                {
                    "id": "marketplace_eligible__boolean",
                    "display": "Marketplace enabled?",
                    "type": "boolean"
                },
                {
                    "id": "name_text",
                    "display": "Name",
                    "type": "text"
                },
                {
                    "id": "new_responsive__boolean",
                    "display": "New responsive?",
                    "type": "boolean"
                },
                {
                    "id": "number_of_submits_number",
                    "display": "Number of Submits",
                    "type": "number"
                },
                {
                    "id": "owner_s_builder_name__lowercase__text",
                    "display": "Owner's Builder Name (lowercase)",
                    "type": "text"
                },
                {
                    "id": "owner_user",
                    "display": "Owner",
                    "type": "user"
                },
                {
                    "id": "paid_plugins_list_custom_plugins",
                    "display": "Paid plugins",
                    "type": "list.custom.plugin"
                },
                {
                    "id": "pending_boolean",
                    "display": "Pending",
                    "type": "boolean"
                },
                {
                    "id": "pending_category_text",
                    "display": "zpending category",
                    "type": "text"
                },
                {
                    "id": "pending_community_link_text",
                    "display": "Pending Link Forum",
                    "type": "text"
                },
                {
                    "id": "pending_description_text",
                    "display": "Pending Description Long",
                    "type": "text"
                },
                {
                    "id": "pending_documentation_link_text",
                    "display": "Pending Link Documentation",
                    "type": "text"
                },
                {
                    "id": "pending_ease_of_use_option_ease_of_use",
                    "display": "Pending Difficulty Level",
                    "type": "option.ease_of_use"
                },
                {
                    "id": "pending_features_list_custom_template_features",
                    "display": "Pending Features",
                    "type": "list.custom.templatefeature"
                },
                {
                    "id": "pending_gallery_list_file",
                    "display": "Pending Gallery",
                    "type": "list.file"
                },
                {
                    "id": "pending_name_text",
                    "display": "Pending name",
                    "type": "text"
                },
                {
                    "id": "pending_new_responsive__boolean",
                    "display": "Pending new responsive?",
                    "type": "boolean"
                },
                {
                    "id": "pending_screeshot_image",
                    "display": "Pending Screenshot",
                    "type": "image"
                },
                {
                    "id": "pending_summary_text",
                    "display": "Pending Description Short",
                    "type": "text"
                },
                {
                    "id": "pending_template_category_option_template_category",
                    "display": "Pending Category",
                    "type": "option.template_category"
                },
                {
                    "id": "pending_tutorial_link_text",
                    "display": "Pending Link Education",
                    "type": "text"
                },
                {
                    "id": "price_number",
                    "display": "Price",
                    "type": "number"
                },
                {
                    "id": "processed_rating_bulk_workflow__boolean",
                    "display": "Processed rating bulk workflow?",
                    "type": "boolean"
                },
                {
                    "id": "published_boolean",
                    "display": "Published",
                    "type": "boolean"
                },
                {
                    "id": "quick_start__boolean",
                    "display": "Quick Start?",
                    "type": "boolean"
                },
                {
                    "id": "rating_average_number",
                    "display": "Rating average",
                    "type": "number"
                },
                {
                    "id": "rating_count_number",
                    "display": "Rating count",
                    "type": "number"
                },
                {
                    "id": "sale_number",
                    "display": "Sales",
                    "type": "number"
                },
                {
                    "id": "screenshot_image",
                    "display": "Screenshot",
                    "type": "image"
                },
                {
                    "id": "suggest_paid_plan__boolean",
                    "display": "Suggest Paid Plan?",
                    "type": "boolean"
                },
                {
                    "id": "summary_text",
                    "display": "Description Short",
                    "type": "text"
                },
                {
                    "id": "template_category_option_template_category",
                    "display": "Category",
                    "type": "option.template_category"
                },
                {
                    "id": "tep___all_images_list_image",
                    "display": "TEP - screenshots",
                    "type": "list.image"
                },
                {
                    "id": "tep___color_primary_text",
                    "display": "TEP - color primary",
                    "type": "text"
                },
                {
                    "id": "tep___color_secondary_text",
                    "display": "TEP - color secondary",
                    "type": "text"
                },
                {
                    "id": "tep___free_plugin_count_number",
                    "display": "TEP - free plugin count",
                    "type": "number"
                },
                {
                    "id": "tep___free_plugin_ids_list_text",
                    "display": "TEP - free plugin IDs",
                    "type": "list.text"
                },
                {
                    "id": "tep___preview_url_text",
                    "display": "TEP - preview URL",
                    "type": "text"
                },
                {
                    "id": "tep___primary_image_image",
                    "display": "TEP - thumbnail image",
                    "type": "image"
                },
                {
                    "id": "tutorial_link_text",
                    "display": "Link Education",
                    "type": "text"
                },
                {
                    "id": "Created Date",
                    "display": "Created Date",
                    "type": "date"
                },
                {
                    "id": "Modified Date",
                    "display": "Modified Date",
                    "type": "date"
                },
                {
                    "id": "Created By",
                    "display": "Created By",
                    "type": "user"
                },
                {
                    "id": "_id",
                    "display": "unique ID",
                    "type": "text"
                },
                {
                    "id": "Slug",
                    "display": "Slug",
                    "type": "text"
                }
            ]
        },
        "templatecommissionitem": {
            "display": "Template Commission Item",
            "fields": [
                {
                    "id": "bubblestore_affiliate_boolean",
                    "display": "Bubblestore affiliate",
                    "type": "boolean"
                },
                {
                    "id": "buyer_user",
                    "display": "Buyer",
                    "type": "user"
                },
                {
                    "id": "charge_id_text",
                    "display": "Charge ID",
                    "type": "text"
                },
                {
                    "id": "commercial_license_boolean",
                    "display": "Developer license",
                    "type": "boolean"
                },
                {
                    "id": "coupon_custom_template_coupon",
                    "display": "Coupon",
                    "type": "custom.templatecoupon"
                },
                {
                    "id": "paid_boolean",
                    "display": "Paid",
                    "type": "boolean"
                },
                {
                    "id": "paid_to_seller_number",
                    "display": "Paid to seller",
                    "type": "number"
                },
                {
                    "id": "partner_text",
                    "display": "Partner",
                    "type": "text"
                },
                {
                    "id": "refunded_boolean",
                    "display": "Refunded",
                    "type": "boolean"
                },
                {
                    "id": "seller_user",
                    "display": "Seller",
                    "type": "user"
                },
                {
                    "id": "template_custom_template",
                    "display": "Template",
                    "type": "custom.template"
                },
                {
                    "id": "total_amount_number",
                    "display": "Total amount",
                    "type": "number"
                },
                {
                    "id": "utm_campaign_text",
                    "display": "utm_campaign",
                    "type": "text"
                },
                {
                    "id": "utm_content_text",
                    "display": "utm_content",
                    "type": "text"
                },
                {
                    "id": "utm_medium_text",
                    "display": "utm_medium",
                    "type": "text"
                },
                {
                    "id": "utm_source_text",
                    "display": "utm_source",
                    "type": "text"
                },
                {
                    "id": "Created Date",
                    "display": "Created Date",
                    "type": "date"
                },
                {
                    "id": "Modified Date",
                    "display": "Modified Date",
                    "type": "date"
                },
                {
                    "id": "Created By",
                    "display": "Created By",
                    "type": "user"
                },
                {
                    "id": "_id",
                    "display": "unique ID",
                    "type": "text"
                },
                {
                    "id": "Slug",
                    "display": "Slug",
                    "type": "text"
                }
            ]
        },
        "templatecommissionpayout": {
            "display": "Template Commission Payout",
            "fields": [
                {
                    "id": "amount_number",
                    "display": "Amount",
                    "type": "number"
                },
                {
                    "id": "contributor_receipt_custom_contributor_payout",
                    "display": "Contributor Receipt",
                    "type": "custom.contributorpayout"
                },
                {
                    "id": "items_list_custom_template_commission_item",
                    "display": "Items",
                    "type": "list.custom.templatecommissionitem"
                },
                {
                    "id": "month_text",
                    "display": "Month",
                    "type": "text"
                },
                {
                    "id": "payment_id_text",
                    "display": "Payment ID",
                    "type": "text"
                },
                {
                    "id": "seller_user",
                    "display": "Seller",
                    "type": "user"
                },
                {
                    "id": "transfer_id_text",
                    "display": "Transfer ID",
                    "type": "text"
                },
                {
                    "id": "Created Date",
                    "display": "Created Date",
                    "type": "date"
                },
                {
                    "id": "Modified Date",
                    "display": "Modified Date",
                    "type": "date"
                },
                {
                    "id": "Created By",
                    "display": "Created By",
                    "type": "user"
                },
                {
                    "id": "_id",
                    "display": "unique ID",
                    "type": "text"
                },
                {
                    "id": "Slug",
                    "display": "Slug",
                    "type": "text"
                }
            ]
        },
        "coachingcommissionpayout": {
            "display": "Coaching Commission Payout",
            "fields": [
                {
                    "id": "amount_number",
                    "display": "Amount",
                    "type": "number"
                },
                {
                    "id": "contributor_receipt_custom_contributor_payout",
                    "display": "Contributor Receipt",
                    "type": "custom.contributorpayout"
                },
                {
                    "id": "items_list_custom_coaching_session",
                    "display": "Items",
                    "type": "list.custom.coachingsession"
                },
                {
                    "id": "month_text",
                    "display": "Month",
                    "type": "text"
                },
                {
                    "id": "payment_id_text",
                    "display": "Payment ID",
                    "type": "text"
                },
                {
                    "id": "seller_user",
                    "display": "Coach",
                    "type": "user"
                },
                {
                    "id": "transfer_id_text",
                    "display": "Transfer ID",
                    "type": "text"
                },
                {
                    "id": "Created Date",
                    "display": "Created Date",
                    "type": "date"
                },
                {
                    "id": "Modified Date",
                    "display": "Modified Date",
                    "type": "date"
                },
                {
                    "id": "Created By",
                    "display": "Created By",
                    "type": "user"
                },
                {
                    "id": "_id",
                    "display": "unique ID",
                    "type": "text"
                },
                {
                    "id": "Slug",
                    "display": "Slug",
                    "type": "text"
                }
            ]
        },
        "buildguidedatatype": {
            "display": "Build guide Data Type",
            "fields": [
                {
                    "id": "description_text",
                    "display": "Description",
                    "type": "text"
                },
                {
                    "id": "fields_list_text",
                    "display": "Fields",
                    "type": "list.text"
                },
                {
                    "id": "name_text",
                    "display": "Name",
                    "type": "text"
                },
                {
                    "id": "translator_feature_custom_translator_feature",
                    "display": "â†ª Build guide",
                    "type": "custom.buildguide"
                },
                {
                    "id": "translator_idea_custom_translator_idea",
                    "display": "â†ª Build guide idea",
                    "type": "custom.buildguideidea"
                },
                {
                    "id": "Created Date",
                    "display": "Created Date",
                    "type": "date"
                },
                {
                    "id": "Modified Date",
                    "display": "Modified Date",
                    "type": "date"
                },
                {
                    "id": "Created By",
                    "display": "Created By",
                    "type": "user"
                },
                {
                    "id": "_id",
                    "display": "unique ID",
                    "type": "text"
                },
                {
                    "id": "Slug",
                    "display": "Slug",
                    "type": "text"
                }
            ]
        },
        "buildguide": {
            "display": "Build guide",
            "fields": [
                {
                    "id": "data_types_list_custom_translator_data_type",
                    "display": "â†ª Data types",
                    "type": "list.custom.buildguidedatatype"
                },
                {
                    "id": "description_text",
                    "display": "Description",
                    "type": "text"
                },
                {
                    "id": "difficulty_level_number",
                    "display": "Difficulty level",
                    "type": "number"
                },
                {
                    "id": "feedback_text",
                    "display": "Feedback",
                    "type": "text"
                },
                {
                    "id": "generated__boolean",
                    "display": "Generated?",
                    "type": "boolean"
                },
                {
                    "id": "generation_started__boolean",
                    "display": "Generation started?",
                    "type": "boolean"
                },
                {
                    "id": "model_option_openai_model",
                    "display": "Model",
                    "type": "option.openai_model"
                },
                {
                    "id": "name_text",
                    "display": "Name",
                    "type": "text"
                },
                {
                    "id": "plugin_required__boolean",
                    "display": "Plugin required?",
                    "type": "boolean"
                },
                {
                    "id": "plugin_suggestions_list_text",
                    "display": "Plugin suggestions",
                    "type": "list.text"
                },
                {
                    "id": "steps_list_custom_translator_step",
                    "display": "â†ª Steps",
                    "type": "list.custom.buildguidestep"
                },
                {
                    "id": "tokens___completion_number",
                    "display": "Tokens - Output",
                    "type": "number"
                },
                {
                    "id": "tokens___prompt_number",
                    "display": "Tokens - Input",
                    "type": "number"
                },
                {
                    "id": "tokens___total_cost_number",
                    "display": "Tokens - Cost",
                    "type": "number"
                },
                {
                    "id": "translator_idea_custom_translator_idea",
                    "display": "â†ª Build guide idea",
                    "type": "custom.buildguideidea"
                },
                {
                    "id": "Created Date",
                    "display": "Created Date",
                    "type": "date"
                },
                {
                    "id": "Modified Date",
                    "display": "Modified Date",
                    "type": "date"
                },
                {
                    "id": "Created By",
                    "display": "Created By",
                    "type": "user"
                },
                {
                    "id": "_id",
                    "display": "unique ID",
                    "type": "text"
                },
                {
                    "id": "Slug",
                    "display": "Slug",
                    "type": "text"
                }
            ]
        },
        "buildguidestep": {
            "display": "Build guide Step",
            "fields": [
                {
                    "id": "child_steps_list_text",
                    "display": "Child steps",
                    "type": "list.text"
                },
                {
                    "id": "complete__boolean",
                    "display": "Complete?",
                    "type": "boolean"
                },
                {
                    "id": "name_text",
                    "display": "Name",
                    "type": "text"
                },
                {
                    "id": "order_number",
                    "display": "Order",
                    "type": "number"
                },
                {
                    "id": "translator_feature_custom_translator_feature",
                    "display": "â†ª Build guide",
                    "type": "custom.buildguide"
                },
                {
                    "id": "translator_idea_custom_translator_idea",
                    "display": "â†ª Build guide idea",
                    "type": "custom.buildguideidea"
                },
                {
                    "id": "type_text",
                    "display": "Type",
                    "type": "text"
                },
                {
                    "id": "Created Date",
                    "display": "Created Date",
                    "type": "date"
                },
                {
                    "id": "Modified Date",
                    "display": "Modified Date",
                    "type": "date"
                },
                {
                    "id": "Created By",
                    "display": "Created By",
                    "type": "user"
                },
                {
                    "id": "_id",
                    "display": "unique ID",
                    "type": "text"
                },
                {
                    "id": "Slug",
                    "display": "Slug",
                    "type": "text"
                }
            ]
        },
        "academylesson": {
            "display": "Academy Lesson",
            "fields": [
                {
                    "id": "academy_course_custom_course",
                    "display": "Academy Course",
                    "type": "custom.academycourse"
                },
                {
                    "id": "academy_course_section_custom_academy_course_section",
                    "display": "Academy Course Section",
                    "type": "custom.academycoursesection"
                },
                {
                    "id": "arcade_html_text",
                    "display": "Arcade HTML",
                    "type": "text"
                },
                {
                    "id": "audio_download_file",
                    "display": "Audio download",
                    "type": "file"
                },
                {
                    "id": "description_text",
                    "display": "Description",
                    "type": "text"
                },
                {
                    "id": "featured__boolean",
                    "display": "Featured?",
                    "type": "boolean"
                },
                {
                    "id": "files_list_custom_video_resource",
                    "display": "Files",
                    "type": "list.custom.videoresource"
                },
                {
                    "id": "length_text",
                    "display": "Length",
                    "type": "text"
                },
                {
                    "id": "lesson_type_option_academy_lesson_type",
                    "display": "Lesson Type",
                    "type": "option.academy_lesson_type"
                },
                {
                    "id": "number_number",
                    "display": "Number",
                    "type": "number"
                },
                {
                    "id": "page_description_text",
                    "display": "Page description",
                    "type": "text"
                },
                {
                    "id": "published_boolean",
                    "display": "published?",
                    "type": "boolean"
                },
                {
                    "id": "rich_content_text",
                    "display": "Rich content",
                    "type": "text"
                },
                {
                    "id": "templates_list_custom_video_resource",
                    "display": "Templates",
                    "type": "list.custom.videoresource"
                },
                {
                    "id": "thumbnail_image",
                    "display": "Thumbnail",
                    "type": "image"
                },
                {
                    "id": "title_text",
                    "display": "Title",
                    "type": "text"
                },
                {
                    "id": "transcript_download_file",
                    "display": "Transcript download",
                    "type": "file"
                },
                {
                    "id": "video_academy_series_option_video_academy_series",
                    "display": "zAcademy Lesson Series",
                    "type": "option.video_academy_series"
                },
                {
                    "id": "video_tags_list_option_video_tag",
                    "display": "Academy Lesson Tags",
                    "type": "list.option.video_tag"
                },
                {
                    "id": "youtube_id_text",
                    "display": "Youtube ID",
                    "type": "text"
                },
                {
                    "id": "Created Date",
                    "display": "Created Date",
                    "type": "date"
                },
                {
                    "id": "Modified Date",
                    "display": "Modified Date",
                    "type": "date"
                },
                {
                    "id": "Created By",
                    "display": "Created By",
                    "type": "user"
                },
                {
                    "id": "_id",
                    "display": "unique ID",
                    "type": "text"
                },
                {
                    "id": "Slug",
                    "display": "Slug",
                    "type": "text"
                }
            ]
        },
        "workloadcredit": {
            "display": "Workload Credit",
            "fields": [
                {
                    "id": "appname_text",
                    "display": "Appname",
                    "type": "text"
                },
                {
                    "id": "credits_used_number",
                    "display": "Credits used",
                    "type": "number"
                },
                {
                    "id": "front_id_text",
                    "display": "Front ID",
                    "type": "text"
                },
                {
                    "id": "gb_text",
                    "display": "Granted by",
                    "type": "text"
                },
                {
                    "id": "gwu_number",
                    "display": "Granted Workload Units",
                    "type": "number"
                },
                {
                    "id": "month_number",
                    "display": "Month",
                    "type": "number"
                },
                {
                    "id": "note_text",
                    "display": "Note",
                    "type": "text"
                },
                {
                    "id": "reason1_text",
                    "display": "Reason",
                    "type": "text"
                },
                {
                    "id": "recipient_user",
                    "display": "Recipient",
                    "type": "user"
                },
                {
                    "id": "y_number",
                    "display": "Year",
                    "type": "number"
                },
                {
                    "id": "Created Date",
                    "display": "Created Date",
                    "type": "date"
                },
                {
                    "id": "Modified Date",
                    "display": "Modified Date",
                    "type": "date"
                },
                {
                    "id": "Created By",
                    "display": "Created By",
                    "type": "user"
                },
                {
                    "id": "_id",
                    "display": "unique ID",
                    "type": "text"
                },
                {
                    "id": "Slug",
                    "display": "Slug",
                    "type": "text"
                }
            ]
        },
        "user": {
            "display": "User",
            "fields": [
                {
                    "id": "additional_invoice_email_text",
                    "display": "Additional invoice email",
                    "type": "text"
                },
                {
                    "id": "affiliate_code_text",
                    "display": "affiliate code",
                    "type": "text"
                },
                {
                    "id": "affiliate_credit_auto_boolean",
                    "display": "affiliate credit auto",
                    "type": "boolean"
                },
                {
                    "id": "affiliate_payouts_list_custom_affiliate_revenue_payout",
                    "display": "Affiliate Payouts",
                    "type": "list.custom.affiliatecommissionpayout"
                },
                {
                    "id": "affiliate_share_number",
                    "display": "Affiliate share",
                    "type": "number"
                },
                {
                    "id": "affiliate_sign_ups_number",
                    "display": "affiliate sign ups",
                    "type": "number"
                },
                {
                    "id": "affiliate_temp_code_text",
                    "display": "affiliate temp code",
                    "type": "text"
                },
                {
                    "id": "affiliate_user",
                    "display": "Affiliate",
                    "type": "user"
                },
                {
                    "id": "agency_role_text",
                    "display": "Agency Role",
                    "type": "text"
                },
                {
                    "id": "app_being_upgraded_text",
                    "display": "Purchase in progress",
                    "type": "text"
                },
                {
                    "id": "app_goals_list_text",
                    "display": "zapp goals",
                    "type": "list.text"
                },
                {
                    "id": "attended_event_custom_sponsored_event",
                    "display": "attended event",
                    "type": "custom.sponsoredevent"
                },
                {
                    "id": "automated_stripe_payout_boolean",
                    "display": "Automated Stripe Payout",
                    "type": "boolean"
                },
                {
                    "id": "bad_guy_boolean",
                    "display": "bad guy",
                    "type": "boolean"
                },
                {
                    "id": "badges3_list_custom_celebrate_badge",
                    "display": "Celebrate Badges",
                    "type": "list.custom.celebratebadge"
                },
                {
                    "id": "balance_number",
                    "display": "Credit balance",
                    "type": "number"
                },
                {
                    "id": "billing_address__address_1__text",
                    "display": "Billing address (address 1)",
                    "type": "text"
                },
                {
                    "id": "billing_address__address_2__text",
                    "display": "Billing address (address 2)",
                    "type": "text"
                },
                {
                    "id": "billing_address__city__text",
                    "display": "Billing address (city)",
                    "type": "text"
                },
                {
                    "id": "billing_address__state__text",
                    "display": "Billing address (state)",
                    "type": "text"
                },
                {
                    "id": "billing_address__zip__text",
                    "display": "Billing address (zip)",
                    "type": "text"
                },
                {
                    "id": "billing_address_encoded_geographic_address",
                    "display": "Billing address encoded",
                    "type": "geographic_address"
                },
                {
                    "id": "billing_country_text",
                    "display": "Billing country",
                    "type": "text"
                },
                {
                    "id": "bootcamp_affiliate_payouts_list_custom_bootcamp_affiliate_commission_payout",
                    "display": "Bootcamp affiliate payouts",
                    "type": "list.custom.bootcampaffiliatecommissionpayout"
                },
                {
                    "id": "bootcamp_instructor_boolean",
                    "display": "Instructor (controls instructor plan)",
                    "type": "boolean"
                },
                {
                    "id": "bootcamp_instructor_photo_image",
                    "display": "Educator photo",
                    "type": "image"
                },
                {
                    "id": "bootcamp_instructors_list_user",
                    "display": "Bootcamp instructors of user",
                    "type": "list.user"
                },
                {
                    "id": "bootcamps_purchased_list_custom_bootcamp",
                    "display": "Bootcamps purchased",
                    "type": "list.custom.bootcamp"
                },
                {
                    "id": "bought_templates_list_custom_template",
                    "display": "Bought templates",
                    "type": "list.custom.template"
                },
                {
                    "id": "bubble_certifications_list_custom_bubble_certification",
                    "display": "Bubble Certifications",
                    "type": "list.custom.bubblecertificate"
                },
                {
                    "id": "bubble_employee_boolean",
                    "display": "bubble_employee",
                    "type": "boolean"
                },
                {
                    "id": "bubble_team_boolean",
                    "display": "Founder team",
                    "type": "boolean"
                },
                {
                    "id": "bubblestore_affiliate_boolean",
                    "display": "bubblestore affiliate",
                    "type": "boolean"
                },
                {
                    "id": "business_address_text",
                    "display": "Billing address",
                    "type": "text"
                },
                {
                    "id": "business_name_text",
                    "display": "Business name",
                    "type": "text"
                },
                {
                    "id": "business_phone_text",
                    "display": "zBusiness phone",
                    "type": "text"
                },
                {
                    "id": "can_see_user_apps_boolean",
                    "display": "Can see user apps",
                    "type": "boolean"
                },
                {
                    "id": "cancelation_reaon_text",
                    "display": "zCancelation reason",
                    "type": "text"
                },
                {
                    "id": "checkpoints_text",
                    "display": "Checkpoints",
                    "type": "text"
                },
                {
                    "id": "coach1_boolean",
                    "display": "Coach",
                    "type": "boolean"
                },
                {
                    "id": "coach_availability_description_text",
                    "display": "Coach availability description",
                    "type": "text"
                },
                {
                    "id": "coach_bio_text",
                    "display": "Coach bio",
                    "type": "text"
                },
                {
                    "id": "coach_booking_link_text",
                    "display": "Coach booking link",
                    "type": "text"
                },
                {
                    "id": "coach_intro_video_file",
                    "display": "Coach intro video",
                    "type": "file"
                },
                {
                    "id": "coach_profile_custom_coach_profile",
                    "display": "Coach profile",
                    "type": "custom.coachprofile"
                },
                {
                    "id": "coach_profile_hidden_boolean",
                    "display": "Coach profile hidden",
                    "type": "boolean"
                },
                {
                    "id": "coach_public_id_text",
                    "display": "Coach Public ID",
                    "type": "text"
                },
                {
                    "id": "coach_rate_number",
                    "display": "Coach rate",
                    "type": "number"
                },
                {
                    "id": "coach_sessions_completed_number",
                    "display": "Coach sessions completed",
                    "type": "number"
                },
                {
                    "id": "coach_skills_list_text",
                    "display": "Coach skills",
                    "type": "list.text"
                },
                {
                    "id": "coach_sold_out_boolean",
                    "display": "Coach sold out",
                    "type": "boolean"
                },
                {
                    "id": "coaches_of_user_list_user",
                    "display": "Coaches of user",
                    "type": "list.user"
                },
                {
                    "id": "coaching_credits_number",
                    "display": "Coaching credits",
                    "type": "number"
                },
                {
                    "id": "coaching_payouts_list_custom_template_commission_payout1",
                    "display": "Coaching payouts",
                    "type": "list.custom.coachingcommissionpayout"
                },
                {
                    "id": "company_name_text",
                    "display": "Company name",
                    "type": "text"
                },
                {
                    "id": "company_url_text",
                    "display": "Company URL",
                    "type": "text"
                },
                {
                    "id": "cookies_list_text",
                    "display": "Cookies",
                    "type": "list.text"
                },
                {
                    "id": "country_code_text",
                    "display": "Country code",
                    "type": "text"
                },
                {
                    "id": "coupon_attempt_count_number",
                    "display": "Coupon attempt count",
                    "type": "number"
                },
                {
                    "id": "coupon_text",
                    "display": "coupon",
                    "type": "text"
                },
                {
                    "id": "creating_agency__boolean",
                    "display": "Creating agency?",
                    "type": "boolean"
                },
                {
                    "id": "credit_expiration_date_date",
                    "display": "Credit expiration date",
                    "type": "date"
                },
                {
                    "id": "credit_expiration_workflow_text",
                    "display": "Credit expiration workflow",
                    "type": "text"
                },
                {
                    "id": "dedicated_env_text",
                    "display": "dedicated env",
                    "type": "text"
                },
                {
                    "id": "deployed_ever_boolean",
                    "display": "deployed_ever",
                    "type": "boolean"
                },
                {
                    "id": "done_experts_lessons_list_number",
                    "display": "z done_experts_lessons_list_number",
                    "type": "list.number"
                },
                {
                    "id": "done_lessons_list",
                    "display": "z done_lessons_list",
                    "type": "list.number"
                },
                {
                    "id": "draft_application_custom_draft_application_metadata",
                    "display": "Draft Application",
                    "type": "custom.draftapplicationmetadata"
                },
                {
                    "id": "editor_visits_count_number",
                    "display": "editor_visits_count",
                    "type": "number"
                },
                {
                    "id": "email_confirmation_text",
                    "display": "Email confirmation token",
                    "type": "text"
                },
                {
                    "id": "email_confirmed___manual__boolean",
                    "display": "Email confirmed? (manual)",
                    "type": "boolean"
                },
                {
                    "id": "email_verification_clicked_count_number",
                    "display": "Email verification clicked count",
                    "type": "number"
                },
                {
                    "id": "email_verification_sent__boolean",
                    "display": "Email verification sent?",
                    "type": "boolean"
                },
                {
                    "id": "figma_to_bubble_token_text",
                    "display": "Figma to Bubble token",
                    "type": "text"
                },
                {
                    "id": "finish_one_learn_boolean",
                    "display": "zFinish_one_learn",
                    "type": "boolean"
                },
                {
                    "id": "first_name_text",
                    "display": "First name",
                    "type": "text"
                },
                {
                    "id": "forum_username_text",
                    "display": "Forum username",
                    "type": "text"
                },
                {
                    "id": "free_features_list_text",
                    "display": "free features",
                    "type": "list.text"
                },
                {
                    "id": "full_url_text",
                    "display": "full url",
                    "type": "text"
                },
                {
                    "id": "gender_text",
                    "display": "zAccount Survey gender",
                    "type": "text"
                },
                {
                    "id": "growth_experiment_groups__assigned__list_text",
                    "display": "growth experiment groups (assigned)",
                    "type": "list.text"
                },
                {
                    "id": "growth_experiment_groups_list_text",
                    "display": "growth experiment groups",
                    "type": "list.text"
                },
                {
                    "id": "has_conversed_with_ai_chatbot_boolean",
                    "display": "Has conversed with AI chatbot",
                    "type": "boolean"
                },
                {
                    "id": "has_to_agree_to_terms_boolean",
                    "display": "has to agree to terms",
                    "type": "boolean"
                },
                {
                    "id": "immerse_app_custom_immerse_application",
                    "display": "zImmerse_app",
                    "type": "custom.immerseapplication"
                },
                {
                    "id": "immerse_cohort_text",
                    "display": "zImmerse cohort",
                    "type": "text"
                },
                {
                    "id": "initialize_sso__boolean",
                    "display": "Initialize SSO?",
                    "type": "boolean"
                },
                {
                    "id": "instructor_custom_coach",
                    "display": "Instructor Profile",
                    "type": "custom.zbootcampinstructor"
                },
                {
                    "id": "intercom_id_text",
                    "display": "Intercom ID",
                    "type": "text"
                },
                {
                    "id": "invoices_list_custom_invoice",
                    "display": "Invoices",
                    "type": "list.custom.invoice"
                },
                {
                    "id": "is_a_partner_boolean",
                    "display": "zIs a partner",
                    "type": "boolean"
                },
                {
                    "id": "isdeveloper__boolean",
                    "display": "isDeveloper?",
                    "type": "boolean"
                },
                {
                    "id": "iterable_campaignid_number",
                    "display": "Iterable campaignId",
                    "type": "number"
                },
                {
                    "id": "iterable_templateid_number",
                    "display": "Iterable templateId",
                    "type": "number"
                },
                {
                    "id": "iterable_workflow_id_text",
                    "display": "Iterable workflow ID",
                    "type": "text"
                },
                {
                    "id": "job_title_text",
                    "display": "Job Title",
                    "type": "text"
                },
                {
                    "id": "languages_list_text",
                    "display": "Languages",
                    "type": "list.text"
                },
                {
                    "id": "last_affiliate_reset_date",
                    "display": "zLast affiliate reset",
                    "type": "date"
                },
                {
                    "id": "last_app_category_text",
                    "display": "zLast app category",
                    "type": "text"
                },
                {
                    "id": "last_app_goal_text",
                    "display": "zlast app goal",
                    "type": "text"
                },
                {
                    "id": "last_editor_visit_date",
                    "display": "last editor visit",
                    "type": "date"
                },
                {
                    "id": "last_failed_card_notif_date",
                    "display": "last_failed_card_notif",
                    "type": "date"
                },
                {
                    "id": "last_name_text",
                    "display": "Last name",
                    "type": "text"
                },
                {
                    "id": "last_privacy_mention_custom_privacy_policy_update",
                    "display": "last privacy mention",
                    "type": "custom.privacypolicyupdate"
                },
                {
                    "id": "last_release_note_date",
                    "display": "Last release note",
                    "type": "date"
                },
                {
                    "id": "last_survey_response_date",
                    "display": "zAccount Survey last response",
                    "type": "date"
                },
                {
                    "id": "last_watched_video_custom_video",
                    "display": "Last watched video",
                    "type": "custom.academylesson"
                },
                {
                    "id": "legacy_boolean",
                    "display": "legacy",
                    "type": "boolean"
                },
                {
                    "id": "linkedin_link_text",
                    "display": "Linkedin link",
                    "type": "text"
                },
                {
                    "id": "log_actually_building_triggered_date",
                    "display": "log_triggered_actually_building",
                    "type": "date"
                },
                {
                    "id": "log_triggered_first_app_created_date",
                    "display": "log_triggered_first_app_created",
                    "type": "date"
                },
                {
                    "id": "log_triggered_first_subscription_date",
                    "display": "log_triggered_first_subscription",
                    "type": "date"
                },
                {
                    "id": "login_method_text",
                    "display": "login method",
                    "type": "text"
                },
                {
                    "id": "maison_by_default_boolean",
                    "display": "zMaison_by_default",
                    "type": "boolean"
                },
                {
                    "id": "maison_enabled_boolean",
                    "display": "zMaison_enabled",
                    "type": "boolean"
                },
                {
                    "id": "marketplace_profile_custom_marketplace_profile",
                    "display": "Marketplace profile",
                    "type": "custom.marketplaceprofile"
                },
                {
                    "id": "mrr_number",
                    "display": "mrr",
                    "type": "number"
                },
                {
                    "id": "new_responsive_diary_study_number",
                    "display": "zNew responsive diary study",
                    "type": "number"
                },
                {
                    "id": "not_first_sign_up_boolean",
                    "display": "not first sign up",
                    "type": "boolean"
                },
                {
                    "id": "notification_when_sale_boolean",
                    "display": "notification when sale",
                    "type": "boolean"
                },
                {
                    "id": "notification_when_unsubscribe_plugin_boolean",
                    "display": "notification when unsubscribe plugin",
                    "type": "boolean"
                },
                {
                    "id": "onboarding_answers_list_custom_onboarding_answer",
                    "display": "Onboarding Answers",
                    "type": "list.custom.zonboardinganswer"
                },
                {
                    "id": "onboarding_business_backgrounds_list_custom_onboarding_answer",
                    "display": "Onboarding business backgrounds",
                    "type": "list.custom.zonboardinganswer"
                },
                {
                    "id": "onboarding_persona_option_onboarding_persona",
                    "display": "Onboarding Persona",
                    "type": "option.onboarding_persona"
                },
                {
                    "id": "onboarding_status_option_onboarding_status",
                    "display": "Onboarding Status",
                    "type": "option.onboarding_status"
                },
                {
                    "id": "onboarding_tasks_list_option_onboarding_task",
                    "display": "Onboarding tasks",
                    "type": "list.option.onboarding_task"
                },
                {
                    "id": "onboarding_tech_experiences_list_custom_onboarding_answer",
                    "display": "Onboarding tech experiences",
                    "type": "list.custom.zonboardinganswer"
                },
                {
                    "id": "organization_custom_organization",
                    "display": "Organization",
                    "type": "custom.organization"
                },
                {
                    "id": "other_account_text",
                    "display": "zOther account",
                    "type": "text"
                },
                {
                    "id": "paid_user_for_partner_user",
                    "display": "Paid user for affiliate",
                    "type": "user"
                },
                {
                    "id": "paying",
                    "display": "zPaying",
                    "type": "boolean"
                },
                {
                    "id": "payout_threshold_number",
                    "display": "Payout threshold",
                    "type": "number"
                },
                {
                    "id": "paypal_email_text",
                    "display": "Paypal email",
                    "type": "text"
                },
                {
                    "id": "perk_program_custom_perk_program",
                    "display": "Perk program",
                    "type": "custom.perkprogram"
                },
                {
                    "id": "pinned_apps_list_text",
                    "display": "Pinned Apps",
                    "type": "list.text"
                },
                {
                    "id": "plan",
                    "display": "plan",
                    "type": "text"
                },
                {
                    "id": "plugin_builder_description_text",
                    "display": "zPlugin Builder Description",
                    "type": "text"
                },
                {
                    "id": "plugin_builder_email_text",
                    "display": "zPlugin Builder email",
                    "type": "text"
                },
                {
                    "id": "plugin_builder_image_image",
                    "display": "zPlugin Builder Image",
                    "type": "image"
                },
                {
                    "id": "plugin_builder_location_geographic_address",
                    "display": "Location (Coaching)",
                    "type": "geographic_address"
                },
                {
                    "id": "plugin_builder_name_text",
                    "display": "zPlugin Builder name",
                    "type": "text"
                },
                {
                    "id": "plugin_builder_payment_auto_boolean",
                    "display": "Contributor payment auto",
                    "type": "boolean"
                },
                {
                    "id": "plugin_builder_website_text",
                    "display": "zPlugin Builder website",
                    "type": "text"
                },
                {
                    "id": "plugin_payouts_list_custom_plugin_subscription_payout",
                    "display": "Plugin Payouts",
                    "type": "list.custom.plugincommissionpayout"
                },
                {
                    "id": "predicted_onboarding_path_option_predicted_onboarding_path",
                    "display": "Predicted Onboarding Path",
                    "type": "option.predicted_onboarding_path"
                },
                {
                    "id": "prefers_list_view__boolean",
                    "display": "Prefers list view?",
                    "type": "boolean"
                },
                {
                    "id": "pricing_group_text",
                    "display": "zPricing_group",
                    "type": "text"
                },
                {
                    "id": "private_app_overwrite_number",
                    "display": "zPrivate_app_overwrite",
                    "type": "number"
                },
                {
                    "id": "profile_photo_image",
                    "display": "Profile photo",
                    "type": "image"
                },
                {
                    "id": "pseudo",
                    "display": "zPseudo",
                    "type": "text"
                },
                {
                    "id": "recovery_email_text",
                    "display": "Recovery email",
                    "type": "text"
                },
                {
                    "id": "referral_credited_boolean",
                    "display": "referral credited?",
                    "type": "boolean"
                },
                {
                    "id": "referral_program_boolean",
                    "display": "referral program?",
                    "type": "boolean"
                },
                {
                    "id": "referrer_text",
                    "display": "referrer",
                    "type": "text"
                },
                {
                    "id": "referring_domain_text",
                    "display": "referring domain",
                    "type": "text"
                },
                {
                    "id": "reported_signed_up_mixpanel_boolean",
                    "display": "reported signed up segment",
                    "type": "boolean"
                },
                {
                    "id": "responsible_csm_custom_bubble_employee",
                    "display": "Responsible CSM",
                    "type": "custom.bubbleemployee"
                },
                {
                    "id": "saw_in_app_survey_boolean",
                    "display": "zAccount Survey seen?",
                    "type": "boolean"
                },
                {
                    "id": "sec_dash_tooltip_dismissed_date",
                    "display": "Sec Dash tooltip dismissed",
                    "type": "date"
                },
                {
                    "id": "seen_component_library_onboarding_boolean",
                    "display": "seen component library onboarding",
                    "type": "boolean"
                },
                {
                    "id": "seen_editor_help_center_boolean",
                    "display": "seen editor help center",
                    "type": "boolean"
                },
                {
                    "id": "segment_event_count_custom_segment_event_count",
                    "display": "Segment Event Count",
                    "type": "custom.segmenteventcount"
                },
                {
                    "id": "send_invoices_by_email_boolean",
                    "display": "send invoices by email",
                    "type": "boolean"
                },
                {
                    "id": "skip_sorting_app_list_boolean",
                    "display": "skip_sorting_app_list",
                    "type": "boolean"
                },
                {
                    "id": "soft_delete_workflow_id_text",
                    "display": "Soft delete workflow ID",
                    "type": "text"
                },
                {
                    "id": "survey_age_text",
                    "display": "zAccount Survey age",
                    "type": "text"
                },
                {
                    "id": "survey_describe_as_text",
                    "display": "zSurvey Describe as",
                    "type": "text"
                },
                {
                    "id": "survey_ethnicity_text",
                    "display": "zAccount Survey ethnicity",
                    "type": "text"
                },
                {
                    "id": "survey_found_text",
                    "display": "Onboarding attribution",
                    "type": "text"
                },
                {
                    "id": "survey_goals1_text",
                    "display": "zSurvey Goals",
                    "type": "text"
                },
                {
                    "id": "survey_industry_text",
                    "display": "zSurvey Industry",
                    "type": "text"
                },
                {
                    "id": "survey_internal_external_text",
                    "display": "zSurvey Internal/External",
                    "type": "text"
                },
                {
                    "id": "survey_marketing_idea_text",
                    "display": "zSurvey Marketing Idea",
                    "type": "text"
                },
                {
                    "id": "survey_org_size_text",
                    "display": "zSurvey Org Size",
                    "type": "text"
                },
                {
                    "id": "survey_org_type_text",
                    "display": "zSurvey Org type",
                    "type": "text"
                },
                {
                    "id": "survey_self_description_text",
                    "display": "Account Survey self description",
                    "type": "text"
                },
                {
                    "id": "survey_stage1_text",
                    "display": "zSurvey Stage",
                    "type": "text"
                },
                {
                    "id": "survey_technical_experience_text",
                    "display": "zSurvey Technical Experience",
                    "type": "text"
                },
                {
                    "id": "survey_use_for_text",
                    "display": "zSurvey Use for",
                    "type": "text"
                },
                {
                    "id": "suspended_boolean",
                    "display": "suspended",
                    "type": "boolean"
                },
                {
                    "id": "template_being_purchased_custom_template",
                    "display": "Template being purchased",
                    "type": "custom.template"
                },
                {
                    "id": "template_payouts_list_custom_template_commission_payout",
                    "display": "Template Payouts",
                    "type": "list.custom.templatecommissionpayout"
                },
                {
                    "id": "template_seller_blurb_for_email_text",
                    "display": "Template seller blurb for email",
                    "type": "text"
                },
                {
                    "id": "timezone_text",
                    "display": "zDefault timezone",
                    "type": "text"
                },
                {
                    "id": "took_one_learn_boolean",
                    "display": "z took_one_learn",
                    "type": "boolean"
                },
                {
                    "id": "total_charges_number",
                    "display": "Total charges",
                    "type": "number"
                },
                {
                    "id": "tracked_signup_on_fb_boolean",
                    "display": "zTracked signup on fb",
                    "type": "boolean"
                },
                {
                    "id": "transfer_via_paypal__boolean",
                    "display": "Transfer via paypal?",
                    "type": "boolean"
                },
                {
                    "id": "unpaid_subscription_id_text",
                    "display": "Unpaid subscription ID",
                    "type": "text"
                },
                {
                    "id": "up_option_up",
                    "display": "up",
                    "type": "option.up"
                },
                {
                    "id": "used_coupon_boolean",
                    "display": "used coupon",
                    "type": "boolean"
                },
                {
                    "id": "user_agent_text",
                    "display": "user agent",
                    "type": "text"
                },
                {
                    "id": "utm_campaign_text",
                    "display": "utm_campaign",
                    "type": "text"
                },
                {
                    "id": "utm_content_text",
                    "display": "utm_content",
                    "type": "text"
                },
                {
                    "id": "utm_medium_text",
                    "display": "utm_medium",
                    "type": "text"
                },
                {
                    "id": "utm_source_text",
                    "display": "utm_source",
                    "type": "text"
                },
                {
                    "id": "utm_term_text",
                    "display": "zUtm_term",
                    "type": "text"
                },
                {
                    "id": "watched_videos_list_text",
                    "display": "zWatched videos",
                    "type": "list.text"
                },
                {
                    "id": "Created Date",
                    "display": "Created Date",
                    "type": "date"
                },
                {
                    "id": "Modified Date",
                    "display": "Modified Date",
                    "type": "date"
                },
                {
                    "id": "_id",
                    "display": "unique ID",
                    "type": "text"
                },
                {
                    "id": "Slug",
                    "display": "Slug",
                    "type": "text"
                }
            ]
        }
    },
    "app_data": {
        "appname": "meta",
        "favicon": "//s3.amazonaws.com/appforest_uf/f1530294839424x143528842134401200/Icon-no-clearspace.png",
        "app_version": "live",
        "use_captions_for_get": false,
        "domain": "bubble.io"
    }