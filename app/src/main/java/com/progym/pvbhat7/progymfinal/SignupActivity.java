package com.progym.pvbhat7.progymfinal;

import android.content.Context;
import android.content.Intent;
import android.os.AsyncTask;
import android.os.Bundle;
import android.provider.Settings;
import android.support.annotation.NonNull;
import android.support.v7.app.AppCompatActivity;
import android.telephony.TelephonyManager;
import android.text.TextUtils;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ProgressBar;
import android.widget.Toast;

import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;
import com.google.firebase.auth.AuthResult;
import com.google.firebase.auth.FirebaseAuth;

import java.util.HashMap;
import java.util.Random;

import static android.view.View.GONE;

public class SignupActivity extends AppCompatActivity {

    private static final int CODE_POST_REQUEST = 1025;
    private EditText inputReferCode,inputEmail, inputPassword,firstname,lastname,mobile;
    private Button btnSignIn, btnSignUp, btnResetPassword;
    private ProgressBar progressBar;
    private FirebaseAuth auth;
    HashMap<String, String> params=null;
    HashMap<String, String> paramsForReferral=null;
    String referralCode="";
    Session session;
    String androidID;
    String IMEI;
    String email;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_signup);

        session=new Session(getApplicationContext());
        //Get Firebase auth instance
        auth = FirebaseAuth.getInstance();

        btnSignIn = (Button) findViewById(R.id.sign_in_button);
        btnSignUp = (Button) findViewById(R.id.sign_up_button);
        inputEmail = (EditText) findViewById(R.id.email);
        /*firstname = (EditText) findViewById(R.id.firstname);
        lastname = (EditText) findViewById(R.id.lastname);
        mobile = (EditText) findViewById(R.id.mobile);*/

        inputPassword = (EditText) findViewById(R.id.password);
        inputReferCode = (EditText) findViewById(R.id.referCodeInput);
        progressBar = (ProgressBar) findViewById(R.id.progressBar);
        btnResetPassword = (Button) findViewById(R.id.btn_reset_password);

        btnResetPassword.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                startActivity(new Intent(SignupActivity.this, ResetPasswordActivity.class));
            }
        });

        btnSignIn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                finish();
            }
        });

        btnSignUp.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {

                email = inputEmail.getText().toString().trim();
                String password = inputPassword.getText().toString().trim();
                final String inputreferralCode = inputReferCode.getText().toString().trim();


                /*String Firstname = firstname.getText().toString().trim();
                String Lastname = lastname.getText().toString().trim();
                String Mobile = mobile.getText().toString().trim();*/



                if (TextUtils.isEmpty(email)) {
                    Toast.makeText(getApplicationContext(), "Enter email address!", Toast.LENGTH_SHORT).show();
                    return;
                }



                /*if (TextUtils.isEmpty(Firstname)) {
                    Toast.makeText(getApplicationContext(), "Enter Firstname!", Toast.LENGTH_SHORT).show();
                    return;
                }

                if (TextUtils.isEmpty(Lastname)) {
                    Toast.makeText(getApplicationContext(), "Enter Lastname!", Toast.LENGTH_SHORT).show();
                    return;
                }

                if (TextUtils.isEmpty(Mobile)) {
                    Toast.makeText(getApplicationContext(), "Enter Mobile!", Toast.LENGTH_SHORT).show();
                    return;
                }*/

                if (TextUtils.isEmpty(password)) {
                    Toast.makeText(getApplicationContext(), "Enter password!", Toast.LENGTH_SHORT).show();
                    return;
                }

                if (password.length() < 6) {
                    Toast.makeText(getApplicationContext(), "Password too short, enter minimum 6 characters!", Toast.LENGTH_SHORT).show();
                    return;
                }
                /*if (Mobile.length() < 10) {
                    Toast.makeText(getApplicationContext(), "Mobile no not valid!", Toast.LENGTH_SHORT).show();
                    return;
                }*/

                for(int i=0;i<3;i++)
                {
                    referralCode=referralCode+email.charAt(i);
                }

                Random generator = new Random();
                int i1 = generator.nextInt(8) + 1;
                referralCode=referralCode+i1;

                int i2 = generator.nextInt(8) + 1;
                referralCode=referralCode+i2;

                int i3 = generator.nextInt(8) + 1;
                referralCode=referralCode+i3;

                progressBar.setVisibility(View.VISIBLE);
                //create user
                params = new HashMap<>();
                paramsForReferral = new HashMap<>();
                /*params.put("firstname",Firstname);
                params.put("lastname", Lastname);
                params.put("mobile", Mobile);

                */


                params.put("email",email);
                params.put("password",password);
                params.put("walletmoney","100");
                params.put("status","active");
                params.put("referralcode",referralCode);
                //System.out.println("******DATA FROM SIGNUP FORM "+Firstname+" "+Lastname+" "+Mobile+" "+email+" "+password);


                auth.createUserWithEmailAndPassword(email, password)
                        .addOnCompleteListener(SignupActivity.this, new OnCompleteListener<AuthResult>() {
                            @Override
                            public void onComplete(@NonNull Task<AuthResult> task) {
                                Toast.makeText(SignupActivity.this, "Registered Successfully:" + task.isSuccessful(), Toast.LENGTH_SHORT).show();
                                progressBar.setVisibility(View.GONE);
                                // If sign in fails, display a message to the user. If sign in succeeds
                                // the auth state listener will be notified and logic to handle the
                                // signed in user can be handled in the listener.
                                if (!task.isSuccessful()) {
                                    Toast.makeText(SignupActivity.this, "Authentication failed." + task.getException(),
                                            Toast.LENGTH_SHORT).show();
                                } else {



                                    androidID= Settings.Secure.getString(getApplicationContext().getContentResolver(), Settings.Secure.ANDROID_ID);
                                    paramsForReferral.put("email",email);
                                    paramsForReferral.put("referralCode",inputreferralCode);
                                    paramsForReferral.put("deviceId",androidID);
                                    //TelephonyManager telephonyManager=(TelephonyManager)getSystemService(Context.TELEPHONY_SERVICE);
                                    //IMEI=telephonyManager.getDeviceId();

                                    session.setReferralCode(referralCode);
                                    session.setInputReferralCode(inputreferralCode);
                                    PerformNetworkRequest request = new PerformNetworkRequest(Api.URL_CREATE_USER, params, CODE_POST_REQUEST);
                                    request.execute();

                                    PerformNetworkRequest requestReferralMoney = new PerformNetworkRequest(Api.URL_ADD_REFERRAL_ENTRY, paramsForReferral, CODE_POST_REQUEST);
                                    requestReferralMoney.execute();
                                    startActivity(new Intent(SignupActivity.this, LoginActivity.class));
                                    finish();
                                }
                            }
                        });

            }
        });
    }

    class PerformNetworkRequest extends AsyncTask<Void, Void, String> {
        String url;
        HashMap<String, String> params;
        int requestCode;

        PerformNetworkRequest(String url, HashMap<String, String> params, int requestCode) {
            this.url = url;
            this.params = params;
            this.requestCode = requestCode;
        }

        @Override
        protected void onPreExecute() {
            super.onPreExecute();
            progressBar.setVisibility(View.VISIBLE);
        }

        @Override
        protected void onPostExecute(String s) {
            super.onPostExecute(s);
            progressBar.setVisibility(GONE);
            /*try {
                JSONObject object = new JSONObject(s);
                if (!object.getBoolean("error")) {
                    Toast.makeText(getApplicationContext(), object.getString("message"), Toast.LENGTH_SHORT).show();
                    refreshHeroList(object.getJSONArray("heroes"));
                }
            } catch (JSONException e) {
                e.printStackTrace();
            }*/
            startActivity(new Intent(SignupActivity.this, LoginActivity.class));
        }

        @Override
        protected String doInBackground(Void... voids) {
            RequestHandler requestHandler = new RequestHandler();

            if (requestCode == CODE_POST_REQUEST)
                return requestHandler.sendPostRequest(url, params);


            /*if (requestCode == CODE_GET_REQUEST)
                return requestHandler.sendGetRequest(url);*/

            return null;
        }
    }
    @Override
    protected void onResume() {
        super.onResume();
        progressBar.setVisibility(View.GONE);
    }
}
