package repository

type RepositoryErr struct {
	err error
}

func (e RepositoryErr) Error() string {
	return e.err.Error()
}

func (e RepositoryErr) IsRetryable() bool {
	return false
}

func NewRepositoryErr(err error) RepositoryErr {
	return RepositoryErr{err: err}
}
